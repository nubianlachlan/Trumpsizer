'use strict';

const LAYOUT = [
  [
    { key:'q' }, { key:'w' }, { key:'e' }, { key:'r' }, { key:'t' },
    { type:'gap' },
    { key:'y' }, { key:'u' }, { key:'i' }, { key:'o' }, { key:'p' },
    { key:'Backspace', label:'⌫ DEL', cls:'util' }
  ],
  [
    { key:'a' }, { key:'s' }, { key:'d' }, { key:'f' }, { key:'g' },
    { type:'gap' },
    { key:'h' }, { key:'j' }, { key:'k' }, { key:'l' }, { key:';' }, { key:"'" },
    { key:'Enter', label:'ENTER', cls:'special' }
  ],
  [
    { key:'z' }, { key:'x' }, { key:'c' }, { key:'v' }, { key:'b' },
    { type:'gap' },
    { key:'n' }, { key:'m' }, { key:',' }, { key:'.' }, { key:'/' },
    { key:'Escape', label:'ESC', cls:'special' }
  ],
  [
    { key:'Tab', label:'TAB', cls:'special' },
    { key:' ', label:'SPACE  — Sad!', cls:'special', wide: true },
    { key:'Delete', label:'🗑 CLEAR', cls:'util' }
  ]
];

let phraseConfig = {};
let fragments = [];
let muted = false;
const lastKeyTime = {};
const COOLDOWN_MS = 180;

const $textContent = document.getElementById('text-content');
const $display = document.getElementById('display');
const $speakingDot = document.getElementById('speaking-dot');
const $muteBtn = document.getElementById('mute-btn');

const synth = window.speechSynthesis || null;

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
  const entry = phraseConfig[key];
  if (!entry) return null;
  const text = chooseText(entry);
  if (!text) return null;
  return { text, type: entry.type, label: entry.label || text };
}

function speak(phrase) {
  if (muted || !synth) return;

  synth.cancel();
  const u = new SpeechSynthesisUtterance(phrase.text);

  switch (phrase.type) {
    case 'opener':
      u.rate = 0.88;
      u.pitch = 1.12;
      u.volume = 0.9;
      break;
    case 'topic':
      u.rate = 0.78;
      u.pitch = 1.0;
      u.volume = 1.0;
      break;
    case 'eval':
      u.rate = 0.82;
      u.pitch = 0.95;
      u.volume = 0.95;
      break;
    case 'special':
      u.rate = 0.65;
      u.pitch = 1.22;
      u.volume = 1.0;
      break;
    default:
      u.rate = 0.85;
      u.pitch = 1.0;
      u.volume = 1.0;
  }

  u.onstart = () => $speakingDot.classList.add('active');
  u.onend = () => $speakingDot.classList.remove('active');
  u.onerror = () => $speakingDot.classList.remove('active');

  synth.speak(u);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function updateDisplay() {
  $textContent.innerHTML = fragments
    .map(f => `<span class="phrase ${f.type}">${escHtml(f.text)}</span>`)
    .join(' ');
  $display.scrollTop = $display.scrollHeight;
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
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
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

  if (key === 'Backspace') { deleteLast(); return; }
  if (key === 'Delete') { clearAll(); }
}

document.addEventListener('keydown', e => {
  if (['Tab', 'Escape', ' '].includes(e.key)) e.preventDefault();
  handleKey(e.key);
});

function buildKeyboard() {
  const $kb = document.getElementById('keyboard');
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

      const entry = phraseConfig[def.key];
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
  setTimeout(() => $key.classList.remove('pressed'), 160);
}

async function loadPhrases() {
  const response = await fetch('./data/phrases.json');
  if (!response.ok) {
    throw new Error(`Unable to load phrase map: ${response.status}`);
  }
  const data = await response.json();
  phraseConfig = data.phrases || {};
}

async function init() {
  try {
    await loadPhrases();
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
window.toggleMute = toggleMute;

init();
