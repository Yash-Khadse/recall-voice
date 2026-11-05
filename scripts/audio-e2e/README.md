# Audio end-to-end canary

Drives a real voice session against a deployed instance: synthesized speech (English, Hindi, Telugu)
-> anonymous session -> LiveKit room -> STT transcript -> agent reply text -> agent audio heard.

```
cd scripts/audio-e2e
pnpm install
pip install edge-tts            # free neural voices, no key required; ffmpeg must be on PATH
PYTHON=/path/to/python node run.mjs --langs en,hi,te --repeat 1 --json results.json
```

`APP_URL` defaults to https://recall-voice.vercel.app. Exit code is non-zero if any case fails.

Notes
- Each run consumes real quota (Groq STT/LLM, Gemini TTS) and counts against the per-IP admission
  limit (3 starts/hour), so keep `--repeat` small. A Gemini TTS 429 is reported as
  "no agent audio heard" while the text reply is still checked.
- Latencies printed are measured from the end of the user's audio (including ~2s of trailing
  silence the harness adds so end-of-turn detection fires).
