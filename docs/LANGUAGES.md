# Language and speech validation

| Flow | Implementation | Evidence |
| --- | --- | --- |
| English | Whisper auto/manual language, configured LLM, optional Gemini TTS or matching browser voice | No live audio run yet |
| Hindi | Original Devanagari preserved, manual `hi` or detection; same reasoning path | Unicode tests only; no accent/voice evaluation |
| Telugu | Original Telugu preserved, manual `te` or detection; same reasoning path | Unicode tests only; no audio evaluation |
| Hinglish/code switching | Auto transcription; prompt asks model to preserve code switching | Real recorded test pending |

Groq Whisper receives `detect_language=True` for auto mode. No English-only translation endpoint is used. Whisper processes VAD-delimited utterances; this is not native partial STT. The LiveKit transport and LLM/output paths stream independently.

Kokoro's official model card describes 82M parameters and Apache-2.0 weights; it must not be assumed to cover Telugu. IndicF5 lists Hindi/Telugu and MIT licensing, but its files require accepting access conditions and synthesis requires consented reference audio plus transcript. Its model card now recommends Indic-Speak. Neither is bundled as an untested default. [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), [IndicF5](https://huggingface.co/ai4bharat/IndicF5).

## Test protocol before changing any label to verified

Use recordings made with consent, without personal or sensitive data. Keep source recordings out of the public repository unless the speaker permits publication. Record microphone, device, browser/version, room noise, model IDs, worker region, sample rate and cold/warm state.

Test at least 20 utterances per priority language, including:

- “Remember that I am preparing for interviews.”
- “मुझे हिंदी में जवाब दो। कल के इंटरव्यू की तैयारी के लिए एक नोट बनाओ।”
- “తెలుగులో మాట్లాడగలవా? రేపటి ఇంటర్వ్యూ కోసం ఒక పని జోడించు.”
- “Kal interview hai, help me prepare a short introduction.”
- Corrections, numbers, named entities, short acknowledgements and silence.

Annotate reference transcripts; calculate WER for English and both WER/CER for Hindi/Telugu with documented normalization. Have a fluent speaker rate the response's language and TTS intelligibility. Do not use model confidence alone as evidence of quality.

For interruptions, begin speaking during TTS, record time from actual speech onset to old playback stopping, and verify the response does not resume incorrectly. Test text input during speech, microphone rejection, device removal and network loss on desktop and mobile browsers.

Worker logs aggregate STT duration, LLM first token, memory retrieval, TTS first audio and control-command interruption. Control-command interruption is not a substitute for acoustic barge-in latency. End-to-end latency needs a synchronized audio/client measurement; it has not been collected.

No CPU TTS timing or subsecond response claim is currently supported.
