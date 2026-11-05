import { RoomServiceClient } from 'livekit-server-sdk';
import { admin, configured, json } from '@/lib/server/context';
export const dynamic = 'force-dynamic';

type Check = { name: 'database' | 'livekit'; ok: boolean };
const CACHE_MS = 30_000;
let cache: { at: number; checks: Check[] } | null = null;

function withTimeout<T>(promise: PromiseLike<T>, ms = 4000): Promise<T> {
  return Promise.race([Promise.resolve(promise), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

// Public endpoint: results are cached so it cannot be used to hammer providers.
async function readiness(): Promise<Check[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.checks;
  const [database, livekit] = await Promise.all([
    withTimeout(admin().from('sessions').select('id').limit(1)).then((r) => !r.error).catch(() => false),
    withTimeout(new RoomServiceClient(process.env.LIVEKIT_URL!, process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!).listRooms()).then(() => true).catch(() => false),
  ]);
  const checks: Check[] = [{ name: 'database', ok: database }, { name: 'livekit', ok: livekit }];
  cache = { at: Date.now(), checks };
  return checks;
}

export async function GET() {
  if (!configured()) {
    return json({ configured: false, mode: 'cloud', status: 'not_configured', voiceVerified: false, languages: ['en', 'hi', 'te'], message: 'Cloud accounts are not configured. Local mode is available after setup.' });
  }
  const checks = await readiness();
  const failed = checks.filter((c) => !c.ok).map((c) => c.name);
  const degraded = failed.length > 0;
  return json({
    configured: true,
    mode: 'cloud',
    status: degraded ? 'degraded' : 'ok',
    checks: Object.fromEntries(checks.map((c) => [c.name, c.ok])),
    voiceVerified: false,
    languages: ['en', 'hi', 'te'],
    message: degraded
      ? `Part of the service is unavailable (${failed.join(', ')}). Voice may not start; please try again shortly.`
      : 'Voice service is ready. The first reply after idle time can take a few seconds while the agent wakes up.',
  });
}
