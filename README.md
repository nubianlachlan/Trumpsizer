# 🎤 TRUMPSIZER — The Rhetorical Keyboard

A browser-based meme keyboard game where every key press triggers a short spoken phrase, letting you rapidly assemble hilarious, rally-style speech patterns.

## How to Play

Open `index.html` in any modern browser (or visit the deployed site) and start typing. Each key maps to a phrase fragment:

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
| On-screen buttons | Delete Last · Clear All · Copy · Mute |

## Features

- **35 mapped keys** — all 26 letters plus punctuation and special keys
- **SpeechSynthesis API** — stylised rhetorical delivery with cadence tuned per phrase type  
  - Openers: confident, slightly quick, higher pitch  
  - Topics: deliberate, slower, neutral pitch  
  - Evaluations: emphatic, slightly lower pitch  
  - Punchlines: punchy, slow, high pitch for comedic effect
- **Colour-coded keyboard** — spatial grouping reinforces sentence construction through muscle memory
- **Live text display** — accumulates coloured phrase spans as you type
- **Zero dependencies** — single `index.html`, fully frontend-only static site

## Phrase Design

The phrase library was designed through corpus-style analysis of rally-speech rhetorical patterns:

- **Openers** reflect certainty assertions, personal authority claims, and universalising framing
- **Topics** cover recurring rally subjects: trade, media, borders, economy, national identity
- **Evaluations** use superlative praise, alarm framing, and conspiracy framing
- **Punchlines** are punchy rebukes, pattern generalisations, and certainty closers

These building blocks interlock cleanly — *opener → topic → evaluation → punchline* — producing fluent, funny sentences without attempting to replicate any individual's voice or biometric characteristics.

## Running Locally

```bash
# Any static file server works, e.g.:
python3 -m http.server 8080
# then open http://localhost:8080/
```

Or just open `index.html` directly in your browser.