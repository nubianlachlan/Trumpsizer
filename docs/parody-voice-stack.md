# Parody Voice Stack (Trump-adjacent, Non-Identical)

## Goal

Deliver a voice that feels close in cadence and rhetorical energy while remaining clearly synthetic and non-identical.

## Voice spec

- **Tempo swings:** faster openers, slower topic clauses, emphatic punchline slowdown.
- **Stress bursts:** controlled emphasis peaks on evaluative fragments.
- **Repetition feel:** phrase variants include patterned repeats for rally rhythm.
- **Intonation arc:** rise on setup, fall on close, deeper phrase-final drop for punchlines.
- **Pause profile:** short pauses between fragments, longer pause before specials.

## Realism ceiling

- Keep style recognizable as parody rhetoric.
- Do **not** target biometric similarity or identity claims.
- Keep delivery synthetic and stylized.

## Engine design

- Frontend keeps keyboard + phrase-map architecture.
- Voice engine supports:
  - `auto` mode: external API first, browser SpeechSynthesis fallback.
  - `browser` mode: SpeechSynthesis only.
- Voice presets:
  - `satire-subtle`
  - `satire-strong`
  - `rally-comic`

## External TTS API contract

`POST /api/tts`

Request fields:

- `text` (string)
- `phraseType` (`opener|topic|eval|special`)
- `stylePack` (string)
- `voicePreset` (string)
- `parodySafety` object
- `prosody` object

Supported response shapes:

- Binary audio response (`audio/*` content type), or
- JSON with `audioBase64` + optional `mimeType`, or
- JSON with `audioUrl`

## Caching strategy

- Cache generated audio by `(endpoint, stylePack, voicePreset, phraseType, text)`.
- Use bounded in-memory LRU-like eviction to keep latency low in gameplay.

## Compliance layer

- Phrase sanitation and length cap.
- Block direct identity claims in generated fragments.
- Keep phrase set focused on broad rhetorical forms, not direct quote replication.

## A/B listening rubric

Score each preset from 1–5:

1. **Recognizability** (parody cadence match)
2. **Comedic effect** (punchline timing and rhythm)
3. **Intelligibility** (clarity of words)
4. **Non-identity safety** (clearly not exact imitation)

## Tuning order (4–6 controls first)

1. speaking rate contour
2. pause length
3. emphasis depth
4. pitch spread
5. breath/noise amount
6. phrase-final drop
