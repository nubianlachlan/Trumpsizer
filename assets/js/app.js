'use strict';

const LAYOUT = [
  [
    { key: 'q' }, { key: 'w' }, { key: 'e' }, { key: 'r' }, { key: 't' },
    { type: 'gap' },
    { key: 'y' }, { key: 'u' }, { key: 'i' }, { key: 'o' }, { key: 'p' },
    { key: 'Backspace', label: '⌫ DEL', cls: 'util' }
  ],
  [
    { key: 'a' }, { key: 's' }, { key: 'd' }, { key: 'f' }, { key: 'g' },
    { type: 'gap' },
    { key: 'h' }, { key: 'j' }, { key: 'k' }, { key: 'l' }, { key: ';' }, { key: '\'' },
    { key: 'Enter', label: 'ENTER', cls: 'special' }
  ],
  [
    { key: 'z' }, { key: 'x' }, { key: 'c' }, { key: 'v' }, { key: 'b' },
    { type: 'gap' },
    { key: 'n' }, { key: 'm' }, { key: ',' }, { key: '.' }, { key: '/' },
    { key: 'Escape', label: 'ESC', cls: 'special' }
  ],
  [
    { key: 'Tab', label: 'TAB', cls: 'special' },
    { key: ' ', label: 'SPACE  — Sad!', cls: 'special', wide: true },
    { key: 'Delete', label: '🗑 CLEAR', cls: 'util' }
  ]
];

const VALID_TYPES = new Set(['opener', 'topic', 'eval', 'special']);
const ALLOWED_VOICE_MODES = new Set(['auto', 'browser']);
const DEFAULT_VOICE_MODE = 'auto';
const DEFAULT_VOICE_PRESET = 'rally-comic';
const COOLDOWN_MS = 180;
const MAX_FRAGMENT_TEXT_LENGTH = 140;
const MAX_FRAGMENT_COUNT = 200;
const SHARE_BUTTON_FEEDBACK_MS = 1200;
const KEY_FLASH_DURATION_MS = 160;
const EXTERNAL_TTS_TIMEOUT_MS = 2400;
const TTS_CACHE_MAX_ENTRIES = 220;
const PREFERRED_VOICE_HINTS = ['david', 'microsoft', 'male', 'daniel', 'guy', 'ryan'];

const VOICE_PRESETS = {
  'satire-subtle': {
    name: 'Satire Subtle',
    browser: {
      opener: { rate: 0.86, pitch: 1.04, volume: 0.9 },
      topic: { rate: 0.8, pitch: 0.98, volume: 0.98 },
      eval: { rate: 0.79, pitch: 0.94, volume: 0.96 },
      special: { rate: 0.7, pitch: 1.08, volume: 1.0 },
      default: { rate: 0.83, pitch: 1.0, volume: 1.0 }
    },
    api: {
      styleStrength: 0.42,
      speakingRate: 0.9,
      pauseMs: 220,
      emphasisDepth: 0.35,
      pitchSpread: 0.24,
      phraseFinalDrop: 0.28,
      breathiness: 0.1
    }
  },
  'satire-strong': {
    name: 'Satire Strong',
    browser: {
      opener: { rate: 0.9, pitch: 1.1, volume: 0.92 },
      topic: { rate: 0.8, pitch: 1.0, volume: 1.0 },
      eval: { rate: 0.82, pitch: 0.93, volume: 0.98 },
      special: { rate: 0.68, pitch: 1.18, volume: 1.0 },
      default: { rate: 0.85, pitch: 1.0, volume: 1.0 }
    },
    api: {
      styleStrength: 0.6,
      speakingRate: 0.93,
      pauseMs: 245,
      emphasisDepth: 0.5,
      pitchSpread: 0.31,
      phraseFinalDrop: 0.36,
      breathiness: 0.16
    }
  },
  'rally-comic': {
    name: 'Parody Rally',
    browser: {
      opener: { rate: 0.92, pitch: 1.13, volume: 0.94 },
      topic: { rate: 0.81, pitch: 1.0, volume: 1.0 },
      eval: { rate: 0.83, pitch: 0.91, volume: 1.0 },
      special: { rate: 0.66, pitch: 1.24, volume: 1.0 },
      default: { rate: 0.86, pitch: 1.0, volume: 1.0 }
    },
    api: {
      styleStrength: 0.74,
      speakingRate: 0.97,
      pauseMs: 285,
      emphasisDepth: 0.63,
      pitchSpread: 0.38,
      phraseFinalDrop: 0.45,
      breathiness: 0.21
    }
  }
};

const COMPLIANCE_BLOCK_PATTERNS = [
  /\b(i am|i'm|this is)\s+(donald\s+j\.?\s*trump|donald\s+trump|president\s+trump)\b/i,
  /\bi alone can fix it\b/i
];

let stylePacks = {};
let selectedStylePack = '';
let fragments = [];
let muted = false;
let selectedVoiceMode = DEFAULT_VOICE_MODE;
let selectedVoicePreset = DEFAULT_VOICE_PRESET;
let speechToken = 0;
let currentAudio = null;
let externalTtsUnavailable = false;
let preferredVoiceName = null;

const ttsCache = new Map();
const lastKeyTime = {};

const $textContent = document.getElementById('text-content');
const $display = document.getElementById('display');
const $speakingDot = document.getElementById('speaking-dot');
const $muteBtn = document.getElementById('mute-btn');
const $stylePackSelect = document.getElementById('style-pack-select');
const $voiceModeSelect = document.getElementById('voice-mode-select');
const $voicePresetSelect = document.getElementById('voice-preset-select');
const $actionStatus = document.getElementById('action-status');
const $shareBtn = document.getElementById('share-btn');

const synth = window.speechSynthesis || null;

function getActivePhraseMap() {
  const currentPack = stylePacks[selectedStylePack];
  if (currentPack && currentPack.phrases) return currentPack.phrases;
  return {};
}

function normalizePhraseText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim();
}

function passesCompliance(text) {
  const normalized = normalizePhraseText(text);
  if (!normalized) return false;
  if (normalized.length > MAX_FRAGMENT_TEXT_LENGTH) return false;
  return !COMPLIANCE_BLOCK_PATTERNS.some(pattern => pattern.test(normalized));
}

function chooseText(entry) {
  if (!entry) return null;

  const rawOptions = Array.isArray(entry.texts) && entry.texts.length > 0
    ? entry.texts
    : (typeof entry.text === 'string' ? [entry.text] : []);

  const options = rawOptions
    .map(normalizePhraseText)
    .filter(passesCompliance);

  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}

function getPhraseFromKey(key) {
  const entry = getActivePhraseMap()[key];
  if (!entry) return null;
  const text = chooseText(entry);
  if (!text) return null;
  return { text, type: entry.type, label: entry.label || text };
}

function setSpeakingActive(active) {
  if (!$speakingDot) return;
  $speakingDot.classList.toggle('active', !!active);
}

function getVoicePresetConfig() {
  return VOICE_PRESETS[selectedVoicePreset] || VOICE_PRESETS[DEFAULT_VOICE_PRESET];
}

function getBrowserProfile(phraseType) {
  const preset = getVoicePresetConfig();
  return preset.browser[phraseType] || preset.browser.default;
}

function getPreferredVoice() {
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!Array.isArray(voices) || voices.length === 0) return null;

  if (preferredVoiceName) {
    const remembered = voices.find(v => v.name === preferredVoiceName);
    if (remembered) return remembered;
  }

  const priority = voices.find(v =>
    /^en(-|_)?us$/i.test(v.lang) &&
      PREFERRED_VOICE_HINTS.some(hint => v.name.toLowerCase().includes(hint))
  ) || voices.find(v => /^en(-|_)?us$/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));

  if (priority) preferredVoiceName = priority.name;
  return priority || null;
}

function stopCurrentPlayback() {
  if (synth) synth.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
  setSpeakingActive(false);
}

function getTtsEndpoint() {
  const fromUrl = new URL(window.location.href).searchParams.get('ttsEndpoint');
  if (fromUrl) return fromUrl;
  if (typeof window.TRUMPSIZER_TTS_ENDPOINT === 'string' && window.TRUMPSIZER_TTS_ENDPOINT) {
    return window.TRUMPSIZER_TTS_ENDPOINT;
  }
  return '/api/tts';
}

function buildCacheKey(phrase) {
  return [getTtsEndpoint(), selectedStylePack, selectedVoicePreset, phrase.type, phrase.text].join('::');
}

function cacheAudioUrl(cacheKey, audioUrl) {
  if (!cacheKey || !audioUrl) return;
  if (ttsCache.has(cacheKey)) ttsCache.delete(cacheKey);
  ttsCache.set(cacheKey, audioUrl);

  while (ttsCache.size > TTS_CACHE_MAX_ENTRIES) {
    const oldestKey = ttsCache.keys().next().value;
    ttsCache.delete(oldestKey);
  }
}

async function fetchExternalTtsAudioUrl(phrase) {
  const cacheKey = buildCacheKey(phrase);
  const cached = ttsCache.get(cacheKey);
  if (cached) return cached;

  const endpoint = getTtsEndpoint();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXTERNAL_TTS_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        text: phrase.text,
        phraseType: phrase.type,
        stylePack: selectedStylePack,
        voicePreset: selectedVoicePreset,
        parodySafety: {
          styleOnly: true,
          noIdentityClaims: true,
          maxQuoteDensity: 0.25
        },
        prosody: getVoicePresetConfig().api
      })
    });

    if (!response.ok) {
      throw new Error(`TTS API returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('audio/')) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      cacheAudioUrl(cacheKey, blobUrl);
      return blobUrl;
    }

    const payload = await response.json();
    let audioUrl = '';

    if (typeof payload.audioBase64 === 'string' && payload.audioBase64) {
      const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : 'audio/mpeg';
      audioUrl = `data:${mimeType};base64,${payload.audioBase64}`;
    } else if (typeof payload.audioUrl === 'string' && payload.audioUrl) {
      audioUrl = payload.audioUrl;
    }

    if (!audioUrl) {
      throw new Error('TTS API response did not contain playable audio');
    }

    cacheAudioUrl(cacheKey, audioUrl);
    return audioUrl;
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldUseExternalTts() {
  return selectedVoiceMode === 'auto' && !externalTtsUnavailable;
}

function playAudioUrl(audioUrl, token) {
  return new Promise((resolve, reject) => {
    if (!audioUrl || token !== speechToken) {
      resolve(false);
      return;
    }

    stopCurrentPlayback();

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onplay = () => setSpeakingActive(true);
    audio.onended = () => {
      if (token === speechToken) setSpeakingActive(false);
      if (currentAudio === audio) currentAudio = null;
      resolve(true);
    };
    audio.onerror = () => {
      if (token === speechToken) setSpeakingActive(false);
      if (currentAudio === audio) currentAudio = null;
      reject(new Error('Unable to play generated audio'));
    };

    audio.play().catch(reject);
  });
}

function speakWithBrowserSynth(phrase, token) {
  return new Promise(resolve => {
    if (!synth || token !== speechToken) {
      resolve(false);
      return;
    }

    stopCurrentPlayback();

    const utterance = new SpeechSynthesisUtterance(phrase.text);
    const profile = getBrowserProfile(phrase.type);
    const preferredVoice = getPreferredVoice();

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = profile.volume;

    utterance.onstart = () => setSpeakingActive(true);
    utterance.onend = () => {
      if (token === speechToken) setSpeakingActive(false);
      resolve(true);
    };
    utterance.onerror = () => {
      if (token === speechToken) setSpeakingActive(false);
      resolve(false);
    };

    synth.speak(utterance);
  });
}

async function speak(phrase) {
  if (muted) return;

  const token = ++speechToken;

  if (shouldUseExternalTts()) {
    try {
      const audioUrl = await fetchExternalTtsAudioUrl(phrase);
      if (token !== speechToken) return;
      await playAudioUrl(audioUrl, token);
      return;
    } catch (err) {
      console.warn('External parody voice unavailable, falling back to browser TTS.', err);
      externalTtsUnavailable = true;
      setActionStatus('Parody voice API unavailable — using browser fallback.');
    }
  }

  await speakWithBrowserSynth(phrase, token);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setActionStatus(message) {
  if (!$actionStatus) return;
  $actionStatus.textContent = message;
}

function encodeState(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const charString = bytes.reduce((str, byte) => str + String.fromCharCode(byte), '');
  return btoa(charString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeState(encoded) {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const missingPadding = padded.length % 4;
  const withPadding = missingPadding ? padded + '='.repeat(4 - missingPadding) : padded;
  const binary = atob(withPadding);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

function syncUrlState() {
  const url = new URL(window.location.href);

  if (selectedStylePack) {
    url.searchParams.set('style', selectedStylePack);
  } else {
    url.searchParams.delete('style');
  }

  if (selectedVoiceMode !== DEFAULT_VOICE_MODE) {
    url.searchParams.set('voiceMode', selectedVoiceMode);
  } else {
    url.searchParams.delete('voiceMode');
  }

  if (selectedVoicePreset !== DEFAULT_VOICE_PRESET) {
    url.searchParams.set('voicePreset', selectedVoicePreset);
  } else {
    url.searchParams.delete('voicePreset');
  }

  if (fragments.length > 0) {
    url.searchParams.set('state', encodeState({ fragments }));
  } else {
    url.searchParams.delete('state');
  }

  window.history.replaceState({}, '', url.toString());
}

function updateDisplay() {
  $textContent.innerHTML = fragments
    .map(f => `<span class="phrase ${f.type}">${escHtml(f.text)}</span>`)
    .join(' ');
  $display.scrollTop = $display.scrollHeight;
  syncUrlState();
}

function addPhrase(phrase) {
  fragments.push({ text: phrase.text, type: phrase.type });
  updateDisplay();
  speak(phrase);
}

function deleteLast() {
  if (fragments.length === 0) return;
  fragments.pop();
  updateDisplay();
}

function clearAll() {
  fragments = [];
  updateDisplay();
  stopCurrentPlayback();
}

function copyText() {
  const text = fragments.map(f => f.text).join(' ');
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    setActionStatus('Speech text copied to clipboard.');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    setActionStatus('Speech text copied to clipboard.');
  });
}

function copyShareLink() {
  const url = new URL(window.location.href);
  url.searchParams.set('style', selectedStylePack);

  if (selectedVoiceMode !== DEFAULT_VOICE_MODE) {
    url.searchParams.set('voiceMode', selectedVoiceMode);
  }
  if (selectedVoicePreset !== DEFAULT_VOICE_PRESET) {
    url.searchParams.set('voicePreset', selectedVoicePreset);
  }

  if (fragments.length > 0) {
    url.searchParams.set('state', encodeState({ fragments }));
  } else {
    url.searchParams.delete('state');
  }

  const link = url.toString();

  navigator.clipboard.writeText(link).then(() => {
    if ($shareBtn) {
      const oldLabel = $shareBtn.textContent;
      $shareBtn.textContent = '✅ Share Link Copied';
      setTimeout(() => { $shareBtn.textContent = oldLabel; }, SHARE_BUTTON_FEEDBACK_MS);
    }
    setActionStatus('Share link copied to clipboard.');
  }).catch(() => {
    setActionStatus('Unable to copy share link in this browser.');
  });
}

function toggleMute() {
  muted = !muted;
  $muteBtn.textContent = muted ? '🔇 Unmute' : '🔊 Mute';
  if (muted) {
    stopCurrentPlayback();
  }
}

function setStylePack(packId) {
  if (!stylePacks[packId]) return;
  selectedStylePack = packId;
  if ($stylePackSelect) $stylePackSelect.value = packId;
  buildKeyboard();
  updateDisplay();
  setActionStatus(`Style pack changed to ${stylePacks[packId].name}.`);
}

function setVoiceMode(mode) {
  if (!ALLOWED_VOICE_MODES.has(mode)) return;
  selectedVoiceMode = mode;
  externalTtsUnavailable = false;
  if ($voiceModeSelect) $voiceModeSelect.value = mode;
  syncUrlState();
  setActionStatus(mode === 'browser'
    ? 'Voice engine set to browser only.'
    : 'Voice engine set to auto (API with browser fallback).');
}

function setVoicePreset(preset) {
  if (!VOICE_PRESETS[preset]) return;
  selectedVoicePreset = preset;
  if ($voicePresetSelect) $voicePresetSelect.value = preset;
  syncUrlState();
  setActionStatus(`Voice preset changed to ${VOICE_PRESETS[preset].name}.`);
}

function sanitizeFragments(rawFragments) {
  if (!Array.isArray(rawFragments)) return [];
  return rawFragments
    .filter(item => item && typeof item.text === 'string' && typeof item.type === 'string' && VALID_TYPES.has(item.type))
    .map(item => ({
      text: normalizePhraseText(item.text).slice(0, MAX_FRAGMENT_TEXT_LENGTH),
      type: item.type
    }))
    .filter(item => passesCompliance(item.text))
    .slice(0, MAX_FRAGMENT_COUNT);
}

function restoreStateFromUrl() {
  const url = new URL(window.location.href);
  const styleFromUrl = url.searchParams.get('style');
  if (styleFromUrl && stylePacks[styleFromUrl]) {
    selectedStylePack = styleFromUrl;
  }

  const voiceModeFromUrl = url.searchParams.get('voiceMode');
  if (voiceModeFromUrl && ALLOWED_VOICE_MODES.has(voiceModeFromUrl)) {
    selectedVoiceMode = voiceModeFromUrl;
  }

  const voicePresetFromUrl = url.searchParams.get('voicePreset');
  if (voicePresetFromUrl && VOICE_PRESETS[voicePresetFromUrl]) {
    selectedVoicePreset = voicePresetFromUrl;
  }

  const encodedState = url.searchParams.get('state');
  if (!encodedState) return;

  try {
    const decoded = decodeState(encodedState);
    fragments = sanitizeFragments(decoded.fragments);
  } catch (err) {
    console.warn('Unable to restore state from URL', err);
    fragments = [];
  }
}

function handleKey(key) {
  const now = Date.now();
  if (now - (lastKeyTime[key] || 0) < COOLDOWN_MS) return;
  lastKeyTime[key] = now;

  const phrase = getPhraseFromKey(key);
  if (phrase) {
    addPhrase(phrase);
    flashKey(key);
    return;
  }

  if (key === 'Backspace') {
    deleteLast();
    flashKey(key);
    return;
  }
  if (key === 'Delete') {
    clearAll();
    flashKey(key);
  }
}

document.addEventListener('keydown', e => {
  if (['Tab', 'Escape', ' '].includes(e.key)) e.preventDefault();
  handleKey(e.key);
});

function buildKeyboard() {
  const $kb = document.getElementById('keyboard');
  const activeMap = getActivePhraseMap();
  $kb.innerHTML = '';

  LAYOUT.forEach(rowDef => {
    const $row = document.createElement('div');
    $row.className = 'key-row';

    rowDef.forEach(def => {
      if (def.type === 'gap') {
        const $gap = document.createElement('div');
        $gap.className = 'zone-gap';
        $row.appendChild($gap);
        return;
      }

      const entry = activeMap[def.key];
      const type = def.cls || (entry ? entry.type : 'util');
      const label = def.label || (entry ? entry.label : def.key);

      const $key = document.createElement('div');
      $key.className = `key ${type}`;
      $key.dataset.key = def.key;
      $key.setAttribute('role', 'button');
      $key.setAttribute('aria-label', label);
      $key.setAttribute('tabindex', '-1');

      if (def.wide) $key.style.minWidth = '200px';

      const displayLetter =
        def.key.length === 1 && def.key !== ' '
          ? def.key.toUpperCase()
          : (def.label ? def.label.split(' ')[0] : def.key);

      $key.innerHTML =
        `<span class="key-letter">${escHtml(displayLetter)}</span>` +
        `<span class="key-label">${escHtml(label)}</span>`;

      $key.addEventListener('mousedown', e => {
        e.preventDefault();
        handleKey(def.key);
      });

      $row.appendChild($key);
    });

    $kb.appendChild($row);
  });
}

function flashKey(key) {
  const $key = document.querySelector(`.key[data-key="${CSS.escape(key)}"]`);
  if (!$key) return;
  $key.classList.add('pressed');
  setTimeout(() => $key.classList.remove('pressed'), KEY_FLASH_DURATION_MS);
}

function buildStylePackSelect() {
  if (!$stylePackSelect) return;
  $stylePackSelect.innerHTML = '';

  Object.entries(stylePacks).forEach(([packId, pack]) => {
    const option = document.createElement('option');
    option.value = packId;
    option.textContent = pack.name || packId;
    $stylePackSelect.appendChild(option);
  });

  $stylePackSelect.value = selectedStylePack;
  $stylePackSelect.addEventListener('change', e => {
    setStylePack(e.target.value);
  });
}

function buildVoiceModeSelect() {
  if (!$voiceModeSelect) return;
  $voiceModeSelect.value = selectedVoiceMode;
  $voiceModeSelect.addEventListener('change', e => {
    setVoiceMode(e.target.value);
  });
}

function buildVoicePresetSelect() {
  if (!$voicePresetSelect) return;
  $voicePresetSelect.innerHTML = '';

  Object.entries(VOICE_PRESETS).forEach(([presetId, preset]) => {
    const option = document.createElement('option');
    option.value = presetId;
    option.textContent = preset.name;
    $voicePresetSelect.appendChild(option);
  });

  $voicePresetSelect.value = selectedVoicePreset;
  $voicePresetSelect.addEventListener('change', e => {
    setVoicePreset(e.target.value);
  });
}

async function loadPhrases() {
  const response = await fetch('./data/phrases.json');
  if (!response.ok) {
    throw new Error(`Unable to load phrase map: ${response.status}`);
  }

  const data = await response.json();

  if (data.stylePacks && typeof data.stylePacks === 'object') {
    stylePacks = data.stylePacks;
    const firstPack = stylePacks.campaign ? 'campaign' : Object.keys(stylePacks)[0];
    selectedStylePack = data.defaultStylePack && stylePacks[data.defaultStylePack]
      ? data.defaultStylePack
      : firstPack;
    return;
  }

  stylePacks = {
    default: {
      name: 'Default',
      phrases: data.phrases || {}
    }
  };
  selectedStylePack = 'default';
}

async function init() {
  try {
    await loadPhrases();
    restoreStateFromUrl();
    buildStylePackSelect();
    buildVoiceModeSelect();
    buildVoicePresetSelect();
    buildKeyboard();
    updateDisplay();
  } catch (err) {
    console.error(err);
    alert('Failed to load phrase map. Please refresh and try again.');
  }

  if (!synth) {
    console.warn('SpeechSynthesis API not available in this browser.');
  }
}

window.deleteLast = deleteLast;
window.clearAll = clearAll;
window.copyText = copyText;
window.copyShareLink = copyShareLink;
window.toggleMute = toggleMute;

init();
