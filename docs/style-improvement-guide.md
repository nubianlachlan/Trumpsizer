# Style Improvement Guide

This project now keeps phrase mappings in `/data/phrases.json`, which makes iterative tuning much easier.

## 1) Expand style coverage safely

Instead of only rally-style lines, keep a balanced mix of:
- Campaign/rally framing
- In-office/governance phrasing
- Negotiation/press-conference phrasing
- General emphatic rhetoric

For each key, add 2–5 alternatives in `texts`.

## 2) Tune cadence in one place

Speech cadence lives in `/assets/js/app.js` inside the voice engine (`VOICE_PRESETS`, API prosody payload, browser synthesis fallback).
Adjust by phrase type:
- `rate`
- `pitch`
- `volume`
- `pauseMs`
- `emphasisDepth`
- `phraseFinalDrop`

Use small changes and compare short recordings before/after.

## 3) Improve phrase quality

For each key:
- Keep variants short and punchy
- Preserve parallel structure inside one key family
- Avoid overlong clauses for better speech synthesis
- Include at least one neutral option for non-political usage

## 4) A/B test phrase sets

Create multiple JSON variants (for example `phrases.v2.json`) and switch file path in `loadPhrases()`.
Track:
- Which variants are most replayed
- Which variants sound most natural in synthesis
- Which combinations produce smoother sentence flow

## 5) On resemblance requests

To keep usage safe and broadly reusable, improvements should focus on **rhetorical patterns and cadence tuning** rather than attempting exact imitation of any real person.

## 6) Use the parody voice stack

- Pick `auto` voice engine to try external parody TTS with browser fallback.
- Use `satire-subtle`, `satire-strong`, and `rally-comic` presets for A/B listening tests.
- Follow `docs/parody-voice-stack.md` for API contract and safety rubric.
