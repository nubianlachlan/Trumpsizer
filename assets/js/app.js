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
const COOLDOWN_MS = 180;
const MAX_FRAGMENT_TEXT_LENGTH = 140;
const MAX_FRAGMENT_COUNT = 200;
const SHARE_BUTTON_FEEDBACK_MS = 1200;
const KEY_FLASH_DURATION_MS = 160;

let stylePacks = {};
let selectedStylePack = '';
let fragments = [];
let muted = false;
const lastKeyTime = {};

const $textContent = document.getElementById('text-content');
const $display = document.getElementById('display');
const $speakingDot = document.getElementById('speaking-dot');
const $muteBtn = document.getElementById('mute-btn');
const $stylePackSelect = document.getElementById('style-pack-select');
const $actionStatus = document.getElementById('action-status');
const $shareBtn = document.getElementById('share-btn');

const synth = window.speechSynthesis || null;

function getActivePhraseMap() {
  const currentPack = stylePacks[selectedStylePack];
  if (currentPack && currentPack.phrases) return currentPack.phrases;
  return {};
}

function chooseText(entry) {
  if (!entry) return null;
  if (Array.isArray(entry.texts) && entry.texts.length > 0) {
    const ix = Math.floor(Math.random() * entry.texts.length);
    return entry.texts[ix];
  }
  if (typeof entry.text === 'string') return entry.text;
  return null;
}

function getPhraseFromKey(key) {
  const entry = getActivePhraseMap()[key];
  if (!entry) return null;
  const text = chooseText(entry);
  if (!text) return null;
  return { text, type: entry.type, label: entry.label || text };
}

function speak(phrase) {
  if (muted || !synth) return;

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(phrase.text);

  switch (phrase.type) {
    case 'opener':
      utterance.rate = 0.88;
      utterance.pitch = 1.12;
      utterance.volume = 0.9;
      break;
    case 'topic':
      utterance.rate = 0.78;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      break;
    case 'eval':
      utterance.rate = 0.82;
      utterance.pitch = 0.95;
      utterance.volume = 0.95;
      break;
    case 'special':
      utterance.rate = 0.65;
      utterance.pitch = 1.22;
      utterance.volume = 1.0;
      break;
    default:
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
  }

  utterance.onstart = () => $speakingDot.classList.add('active');
  utterance.onend = () => $speakingDot.classList.remove('active');
  utterance.onerror = () => $speakingDot.classList.remove('active');

  synth.speak(utterance);
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
  if (synth) synth.cancel();
  $speakingDot.classList.remove('active');
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
  if (muted && synth) {
    synth.cancel();
    $speakingDot.classList.remove('active');
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

function sanitizeFragments(rawFragments) {
  if (!Array.isArray(rawFragments)) return [];
  return rawFragments
    .filter(item => item && typeof item.text === 'string' && typeof item.type === 'string' && VALID_TYPES.has(item.type))
    .map(item => ({
      text: item.text.slice(0, MAX_FRAGMENT_TEXT_LENGTH),
      type: item.type
    }))
    .slice(0, MAX_FRAGMENT_COUNT);
}

function restoreStateFromUrl() {
  const url = new URL(window.location.href);
  const styleFromUrl = url.searchParams.get('style');
  if (styleFromUrl && stylePacks[styleFromUrl]) {
    selectedStylePack = styleFromUrl;
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
