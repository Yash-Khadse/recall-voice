// Real audio round-trip against a deployed Recall Voice instance.
//
//   node run.mjs [--langs en,hi,te] [--repeat 1] [--json out.json]
//
// For each case: synthesize speech (edge-tts + ffmpeg) -> anonymous Supabase session -> POST
// /api/session -> join the LiveKit room as the user -> publish the audio as a microphone ->
// collect the STT transcript, the agent's text reply and whether agent audio was heard.
// Exits non-zero if any case fails, so it can run as a scheduled canary.
//
// Prerequisites on PATH (or set PYTHON=/path/to/python): python with `pip install edge-tts`, ffmpeg.
// Env: APP_URL (default https://recall-voice.vercel.app). The public Supabase URL/anon key are read
// from NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY or scraped from the deployed bundle.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AudioFrame, AudioSource, AudioStream, LocalAudioTrack, Room, RoomEvent, TrackKind, TrackPublishOptions, TrackSource } from '@livekit/rtc-node';

const APP_URL = (process.env.APP_URL || 'https://recall-voice.vercel.app').replace(/\/$/, '');
const SAMPLE_RATE = 48000;
const SCRIPT = { en: /[A-Za-z]/, hi: /[ऀ-ॿ]/, te: /[ఀ-౿]/ };
const CASES = {
  en: { voice: 'en-IN-NeerjaNeural', text: 'Hello. What can you do? Please answer in one short sentence.' },
  hi: { voice: 'hi-IN-SwaraNeural', text: 'नमस्ते, आप मेरी क्या मदद कर सकते हैं? कृपया एक छोटे वाक्य में बताइए।' },
  te: { voice: 'te-IN-ShrutiNeural', text: 'నమస్కారం, మీరు నాకు ఏమి సహాయం చేయగలరు? దయచేసి ఒక చిన్న వాక్యంలో చెప్పండి.' },
};

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const langs = (args.langs || 'en,hi,te').split(',');
const repeat = Number(args.repeat || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();

function synthesize(lang) {
  const dir = mkdtempSync(join(tmpdir(), 'recall-audio-'));
  const mp3 = join(dir, `${lang}.mp3`);
  const pcm = join(dir, `${lang}.pcm`);
  const tts = spawnSync(process.env.PYTHON || 'python', ['-m', 'edge_tts', '--voice', CASES[lang].voice, '--text', CASES[lang].text, '--write-media', mp3], { encoding: 'utf8' });
  if (tts.status !== 0) throw new Error(`edge-tts failed: ${tts.stderr}`);
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-f', 's16le', '-ar', String(SAMPLE_RATE), '-ac', '1', pcm], { encoding: 'utf8' });
  if (ff.status !== 0) throw new Error(`ffmpeg failed: ${ff.stderr}`);
  const bytes = readFileSync(pcm);
  return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

async function supabaseConfig() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
  }
  const html = await (await fetch(APP_URL)).text();
  const chunks = [...new Set(html.match(/\/_next\/static\/[A-Za-z0-9_\-/.]*\.js/g) || [])];
  for (const chunk of chunks) {
    const js = await (await fetch(APP_URL + chunk)).text();
    const url = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
    const key = js.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sb_publishable_[A-Za-z0-9_-]+/)?.[0];
    if (url && key) return { url, key };
  }
  throw new Error('Could not determine the public Supabase config; set NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
}

async function startSession(config, language) {
  const signup = await fetch(`${config.url}/auth/v1/signup`, { method: 'POST', headers: { apikey: config.key, 'Content-Type': 'application/json' }, body: '{}' });
  const auth = await signup.json();
  if (!auth.access_token) throw new Error(`anonymous sign-in failed (${signup.status}) ${auth.msg || auth.error_description || ''}`);
  const res = await fetch(`${APP_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: APP_URL, Authorization: `Bearer ${auth.access_token}` },
    body: JSON.stringify({ language, memoryConsent: false }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`/api/session ${res.status}: ${body.code || body.error}`);
  return body;
}

async function runCase(config, lang) {
  const result = { lang, ok: false, failures: [], userTranscript: '', agentReply: '' };
  const pcm = synthesize(lang);
  const session = await startSession(config, lang);
  const room = new Room();
  const t = { agentJoin: null, audioEnd: null, firstReplyText: null, firstAgentAudio: null };
  let agentAudioHeard = false;

  // Transcription streams carry interim and final text for the same segment; keep the latest per segment.
  const segments = { user: new Map(), agent: new Map() };
  room.registerTextStreamHandler('lk.transcription', async (reader, participant) => {
    const text = (await reader.readAll()).trim();
    if (!text) return;
    const side = participant.identity.startsWith('agent') ? 'agent' : 'user';
    const id = reader.info?.attributes?.['lk.segment_id'] || reader.info?.id;
    segments[side].set(id, text);
    if (side === 'agent') t.firstReplyText ??= now();
    result.userTranscript = [...segments.user.values()].join(' ');
    result.agentReply = [...segments.agent.values()].join(' ');
  });
  room.on(RoomEvent.ParticipantConnected, (p) => { if (p.identity.startsWith('agent')) t.agentJoin ??= now(); });
  room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    if (track.kind !== TrackKind.KIND_AUDIO || !participant.identity.startsWith('agent')) return;
    (async () => {
      for await (const frame of new AudioStream(track, SAMPLE_RATE, 1)) {
        let peak = 0;
        for (const s of frame.data) peak = Math.max(peak, Math.abs(s));
        if (peak > 800 && t.audioEnd) { agentAudioHeard = true; t.firstAgentAudio ??= now(); }
      }
    })().catch(() => {});
  });

  const connectStart = now();
  await room.connect(session.url, session.token, { autoSubscribe: true });
  result.connectMs = Math.round(now() - connectStart);
  if ([...room.remoteParticipants.values()].some((p) => p.identity.startsWith('agent'))) t.agentJoin ??= now();
  const waitStart = now();
  while (!t.agentJoin && now() - waitStart < 40000) await sleep(200);
  if (!t.agentJoin) result.failures.push('agent did not join within 40s');
  else result.agentJoinMs = Math.round(t.agentJoin - connectStart);

  if (t.agentJoin) {
    await sleep(1500); // let the agent session finish starting
    const source = new AudioSource(SAMPLE_RATE, 1);
    const track = LocalAudioTrack.createAudioTrack('mic', source);
    await room.localParticipant.publishTrack(track, new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE }));
    const frameSize = SAMPLE_RATE / 100; // 10 ms
    const send = async (samples) => {
      for (let i = 0; i < samples.length; i += frameSize) {
        const chunk = new Int16Array(frameSize);
        chunk.set(samples.subarray(i, i + frameSize));
        await source.captureFrame(new AudioFrame(chunk, SAMPLE_RATE, 1, frameSize));
      }
    };
    await send(pcm);
    await send(new Int16Array(SAMPLE_RATE * 2)); // trailing silence so end-of-turn fires
    await source.waitForPlayout();
    t.audioEnd = now();
    const replyStart = now();
    while (now() - replyStart < 40000 && !(t.firstReplyText && agentAudioHeard)) await sleep(250);
    await sleep(1500); // allow the reply text stream to complete
  }
  await room.disconnect();

  if (t.audioEnd && t.firstReplyText) result.replyTextMs = Math.round(t.firstReplyText - t.audioEnd);
  if (t.audioEnd && t.firstAgentAudio) result.replyAudioMs = Math.round(t.firstAgentAudio - t.audioEnd);
  result.agentAudioHeard = agentAudioHeard;
  if (!result.userTranscript) result.failures.push('no STT transcript');
  else if (lang !== 'en' && !SCRIPT[lang].test(result.userTranscript)) result.failures.push(`transcript not in ${lang} script`);
  if (!result.agentReply) result.failures.push('no agent text reply');
  else if (lang !== 'en' && !SCRIPT[lang].test(result.agentReply)) result.failures.push(`reply not in ${lang} script`);
  if (!agentAudioHeard) result.failures.push('no agent audio heard');
  result.ok = result.failures.length === 0;
  return result;
}

const config = await supabaseConfig();
const results = [];
for (let round = 0; round < repeat; round++) {
  for (const lang of langs) {
    try { results.push(await runCase(config, lang)); }
    catch (error) { results.push({ lang, ok: false, failures: [String(error.message || error)] }); }
    const r = results.at(-1);
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${lang} agentJoin=${r.agentJoinMs ?? '-'}ms replyText=${r.replyTextMs ?? '-'}ms replyAudio=${r.replyAudioMs ?? '-'}ms ${r.failures.join('; ')}`);
    if (r.userTranscript) console.log(`  heard: ${r.userTranscript.slice(0, 120)}`);
    if (r.agentReply) console.log(`  reply: ${r.agentReply.slice(0, 160)}`);
    await sleep(4000); // stay under the per-user admission limits
  }
}
if (args.json) writeFileSync(args.json, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
