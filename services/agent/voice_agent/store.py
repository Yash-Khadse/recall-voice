"""Owner-scoped durable storage. IDs are always paired with server-derived identity."""

import hashlib
import json
import secrets
import sqlite3
import threading
import time
import uuid
from datetime import UTC, datetime


def now():
    return datetime.now(UTC).isoformat()


class Store:
    def __init__(self, path):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        self.db.executescript("""
          PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY, owner TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL,
            mode TEXT NOT NULL, expires_at REAL NOT NULL, requests INTEGER DEFAULT 0,
            created_at TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS records (
            id TEXT PRIMARY KEY, owner TEXT NOT NULL, kind TEXT NOT NULL,
            data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
          CREATE INDEX IF NOT EXISTS records_owner ON records(owner,kind);
          CREATE TABLE IF NOT EXISTS settings(owner TEXT PRIMARY KEY,data TEXT NOT NULL);
        """)

    def session(self, duration=300, persistent=False, concurrent=3):
        with self.lock, self.db:
            self.purge()
            count = self.db.execute(
                "SELECT count(*) FROM sessions WHERE expires_at>?", (time.time(),)
            ).fetchone()[0]
            if count >= concurrent:
                raise ValueError(
                    "Session capacity reached. Try again after an active session ends."
                )
            session_id, token = str(uuid.uuid4()), secrets.token_urlsafe(32)
            owner = "local-owner" if persistent else session_id
            expiry = time.time() + duration
            self.db.execute(
                "INSERT INTO sessions VALUES(?,?,?,?,?,0,?)",
                (
                    session_id,
                    owner,
                    self.digest(token),
                    "authenticated" if persistent else "anonymous",
                    expiry,
                    now(),
                ),
            )
            return {
                "id": session_id,
                "expires_at": datetime.fromtimestamp(expiry, UTC).isoformat(),
                "mode": "authenticated" if persistent else "anonymous",
            }, token

    @staticmethod
    def digest(token):
        return hashlib.sha256(token.encode()).hexdigest()

    def authenticate(self, token):
        row = self.db.execute(
            "SELECT * FROM sessions WHERE token_hash=? AND expires_at>?",
            (self.digest(token), time.time()),
        ).fetchone()
        if not row:
            raise PermissionError("Session expired or token invalid")
        return dict(row)

    def consume(self, session_id, owner, maximum):
        with self.lock, self.db:
            cursor = self.db.execute(
                "UPDATE sessions SET requests=requests+1 WHERE id=? AND owner=? AND expires_at>? AND requests<?",
                (session_id, owner, time.time(), maximum),
            )
            if not cursor.rowcount:
                raise ValueError("Session expired or request budget exhausted")

    def purge(self):
        expired = self.db.execute(
            "SELECT owner FROM sessions WHERE expires_at<=? AND mode='anonymous'", (time.time(),)
        ).fetchall()
        for row in expired:
            self.db.execute("DELETE FROM records WHERE owner=?", (row[0],))
            self.db.execute("DELETE FROM settings WHERE owner=?", (row[0],))
        self.db.execute(
            "DELETE FROM sessions WHERE expires_at<=? AND mode='anonymous'", (time.time(),)
        )

    def put(self, owner, kind, data, record_id=None):
        with self.lock, self.db:
            if record_id and not self.get(owner, kind, record_id):
                raise KeyError("Record not found")
            record_id = record_id or str(uuid.uuid4())
            timestamp = now()
            self.db.execute(
                "INSERT INTO records VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
                (
                    record_id,
                    owner,
                    kind,
                    json.dumps(data, ensure_ascii=False),
                    timestamp,
                    timestamp,
                ),
            )
            return self.get(owner, kind, record_id)

    def list(self, owner, kind):
        rows = self.db.execute(
            "SELECT * FROM records WHERE owner=? AND kind=? ORDER BY created_at DESC LIMIT 1000",
            (owner, kind),
        ).fetchall()
        return [
            {
                **json.loads(r["data"]),
                "id": r["id"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        ]

    def get(self, owner, kind, record_id):
        return next((r for r in self.list(owner, kind) if r["id"] == record_id), None)

    def delete(self, owner, kind, record_id):
        with self.lock, self.db:
            return bool(
                self.db.execute(
                    "DELETE FROM records WHERE owner=? AND kind=? AND id=?",
                    (owner, kind, record_id),
                ).rowcount
            )

    def preferences(self, owner, data=None):
        if data is not None:
            with self.lock, self.db:
                self.db.execute(
                    "INSERT INTO settings VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data",
                    (owner, json.dumps(data)),
                )
        row = self.db.execute("SELECT data FROM settings WHERE owner=?", (owner,)).fetchone()
        return json.loads(row[0]) if row else {"language": "auto", "memory_consent": False}

    def history(self, owner):
        sessions = [
            dict(r)
            for r in self.db.execute(
                "SELECT id,mode,created_at,expires_at FROM sessions WHERE owner=?", (owner,)
            )
        ]
        return {"sessions": sessions, "messages": list(reversed(self.list(owner, "messages")))}
