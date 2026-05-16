# 🎤 TRUMPSIZER — The Rhetorical Keyboard

A browser-based satire keyboard game where every key press triggers a short spoken phrase, letting you rapidly assemble parody political speech patterns.

> **Parody disclaimer:** This is a satire project for commentary/comedy. It is not affiliated with, endorsed by, or representing any real person, campaign, office, or organization.

## How to Play

Open `index.html` in any modern browser (or visit the deployed site) and start typing. Each key maps to a phrase fragment (with per-key phrase variation loaded from JSON):

| Zone | Keys | Phrase Type | Example |
|------|------|-------------|---------|
| 🔵 Left side | Q W E R T · A S D F G · Z X C V B | **Openers** | "Believe me," / "Look folks," / "Frankly," |
| ⚫ Centre | Y U I O P · H J K L | **Topics** | "China" / "the economy" / "the fake news" |
| 🔴 Right side | N M , . / ; ' | **Evaluations** | "is tremendous" / "is rigged" / "is a disaster" |
| 🟡 Special | Enter · Space · Tab · Esc | **Punchlines** | "WRONG!" / "— Sad!" / "Many such cases!" |

**Example sentence built with Q → Y → N → Enter:**
> *"Believe me, China is tremendous WRONG!"*

## Controls

| Key | Action |
|-----|--------|
| `Backspace` | Remove last phrase |
| `Delete` | Clear everything |
| On-screen controls | Style pack · Voice engine · Voice preset · Delete Last · Clear All · Copy · Mute |

## Features

- **35 mapped keys** — all 26 letters plus punctuation and special keys
- **Style packs** — choose between multiple tone packs from one JSON config
- **External JSON phrase map** — `data/phrases.json` stores style packs and key → phrase variants (`texts`)
- **Randomised phrase variants** — each key can speak multiple alternatives for more variety
- **Shareable links** — copy a URL that preserves the selected style pack and current generated speech
- **Voice engine modes** — `auto` (external parody API → free StreamElements API → browser fallback), `free` (StreamElements API → browser fallback), or `browser` only
- **Voice presets** — `satire-subtle`, `satire-strong`, `rally-comic`
- **External TTS caching** — per-phrase audio caching for lower latency during rapid play
- **SpeechSynthesis fallback** — stylised rhetorical delivery remains available when API is unavailable
- **Colour-coded keyboard** — spatial grouping reinforces sentence construction through muscle memory
- **Live text display** — accumulates coloured phrase spans as you type
- **Safer content posture** — compliance guardrails block direct identity-claim phrasing and keep style parody-focused
- **Zero dependencies** — fully frontend-only static site (`index.html` + `assets/css/styles.css` + `assets/js/app.js` + `data/phrases.json`)

## Phrase Design

The phrase library was designed through corpus-style analysis of rally-speech rhetorical patterns:

- **Openers** reflect certainty assertions, personal authority claims, and universalising framing
- **Topics** cover recurring rally subjects: trade, media, borders, economy, national identity
- **Evaluations** use superlative praise, alarm framing, and conspiracy framing
- **Punchlines** are punchy rebukes, pattern generalisations, and certainty closers

These building blocks interlock cleanly — *opener → topic → evaluation → punchline* — producing fluent, funny sentences while avoiding direct impersonation claims.

## Project Structure

```text
index.html
assets/
  css/styles.css
  js/app.js
data/
  phrases.json
docs/
  style-improvement-guide.md
terms.html
```

## Terms & Disclaimer

See `./terms.html` for acceptable-use and non-affiliation guidance.
See `./docs/parody-voice-stack.md` for the parody voice spec, API contract, and tuning rubric.

## Running Locally

```bash
# Any static file server works, e.g.:
python3 -m http.server 8080
# then open http://localhost:8080/
```

Or just open `index.html` directly in your browser.

## Launch and monitor

- Deploy as a static site as usual
- Track user feedback and moderation signals
- If a phrase or pack raises risk concerns, update `data/phrases.json` quickly and redeploy
