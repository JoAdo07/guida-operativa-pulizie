'use strict';

/* ============================================================
   Opera Guida Personale · Area responsabili
   Vocale → trascrizione AI → guida del dipendente
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmt = s => { s = Math.max(0, Math.round(Number(s) || 0)); return Math.floor(s / 60) + ':' + pad(s % 60); };
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const itDate = iso => { if (!iso) return ''; const p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; };
const cap = s => { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
const stripNote = n => String(n || '').replace(/^[^«]*«/, '').replace(/»\s*$/, '').trim();

/* ============================================================
   Correzione delle parole storte della trascrizione
   (es. colidoglio → corridoio, menza → mensa, riugnioni → riunioni)
   ============================================================ */

const FIX_PHRASES = [
  [/\bsu\s+ottenut[oi]\b/gi, 'svuotamento'],
  [/\bsu\s+otteng?o\b/gi, 'svuoto'],
  [/\bsu\s+ottiene\b/gi, 'svuota'],
  [/\bcolidoglio\b/gi, 'corridoio'],
  [/\bcolidoglia\b/gi, 'corridoio'],
  [/\bcorridoglio\b/gi, 'corridoio'],
  [/\bmenza\b/gi, 'mensa'],
  [/\briugnioni\b/gi, 'riunioni'],
  [/\briugnione\b/gi, 'riunione'],
  [/\boffici\b/gi, 'uffici'],
  [/\bofficio\b/gi, 'ufficio'],
  [/\bspoiatoi\b/gi, 'spogliatoi'],
  [/\bspoiatoio\b/gi, 'spogliatoio'],
  [/\bmagazino\b/gi, 'magazzino'],
  [/\ble\s+polvere\b/gi, 'la polvere'],
  [/\ble\s+polveri\b/gi, 'la polvere'],
  [/\buffici\s+da\b/gi, 'ufficio del'],
  [/\bsu\s+ottenpimento\b/gi, 'svuotamento'],
  [/\bottenpimento\b/gi, 'svuotamento'],
  [/\bda\s+spazzatura\b/gi, 'da spazzare'],
  [/\bspazzatura\s+e\s+lavare\b/gi, 'spazzare e lavare'],
  [/\bi\s+cestino\b/gi, 'i cestini'],
  [/\bla\s+spazzature\b/gi, 'la spazzatura']
];

const VOCAB = ('corridoio corridoi mensa mense riunione riunioni ufficio uffici bagno bagni ' +
  'spogliatoio spogliatoi magazzino magazzini laboratorio laboratori infermeria ascensore ascensori ' +
  'scala scale reception portineria ingresso atrio cortile parcheggio esterni capannone sanitari ' +
  'piastrelle pavimento pavimenti scopatura spazzare spazzatura spolvero polvere polveri svuotamento cestino cestini ' +
  'lavaggio macchinetta caffè caffe detersivo detersivi ecolabel dispenser badge allarme chiave ' +
  'chiavi guanti mascherina lavasciuga carrello mocio aspirapolvere secchio ripostiglio armadietto ' +
  'armadietti corrimano vetro vetri ragnatela ragnatele tavolo tavoli sedia sedie microonde ' +
  'spazzatura rifiuti immondizia differenziata carta plastica organico umido').split(' ');

const KEEP = new Set((VOCAB.join(' ') + ' ' +
  'il lo la i gli le un uno una di a da in con su per tra fra e ed o od ma se che chi cui non ' +
  'più anche come dove quando perché cosa quale quali quanto quanti quanta quante questo questa ' +
  'questi queste quello quella quelli quelle suo sua suoi sue nostro nostra vostri vostre loro ' +
  'ogni tutti tutte tutto tutta qualche alcuno alcuna alcuni alcune molto molta molti molte poco ' +
  'poca pochi poche solo sempre mai già ancora appena proprio davvero forse quasi circa adesso ' +
  'ora oggi ieri domani stamattina stasera mattina pomeriggio sera notte giorno giorni settimana ' +
  'settimane mese mesi anno anni volta volte minuto minuti ora ore mezzora mezzo mezza primo ' +
  'secondo terzo quarto piano terra dentro fuori sopra sotto davanti dietro vicino lontano bene ' +
  'male più meno stesso stessa stessi stesse altro altra altri altre niente nulla qualcosa ' +
  'qualcuno va vanno sono essere fare fatto mettere portare pulire pulizia pulito controllare ' +
  'controllo passare passa viene vengono sala sale stanza stanze locale locali area aree zona zone').split(/\s+/));

const WORD_CACHE = new Map();
const PHON_CACHE = new Map();

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function phon(s) {
  if (PHON_CACHE.has(s)) return PHON_CACHE.get(s);
  let x = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  x = x.replace(/gli/g, 'li').replace(/gn/g, 'ni').replace(/sc/g, 's')
    .replace(/ch/g, 'c').replace(/gh/g, 'g').replace(/qu/g, 'k').replace(/z/g, 's');
  x = x.replace(/([bcdfglmnpqrstv])\1/g, '$1').replace(/h/g, '');
  PHON_CACHE.set(s, x);
  return x;
}

function matchCase(orig, repl) {
  if (orig === orig.toUpperCase()) return repl.toUpperCase();
  if (/^[A-ZÀ-Þ]/.test(orig)) return repl.charAt(0).toUpperCase() + repl.slice(1);
  return repl;
}

function correctWord(word) {
  const low = word.toLowerCase();
  if (low.length < 4 || /\d/.test(low) || KEEP.has(low)) return word;
  if (WORD_CACHE.has(low)) {
    const hit = WORD_CACHE.get(low);
    return hit ? matchCase(word, hit) : word;
  }
  const p = phon(low);
  let best = null;
  for (const cand of VOCAB) {
    const cp = phon(cand);
    if (cand[0] !== low[0] && cp[0] !== p[0]) continue;
    const d = Math.min(lev(low, cand), lev(p, cp) + 0.5);
    const max = low.length >= 8 ? 3 : low.length >= 6 ? 2 : 1;
    const sim = 1 - d / Math.max(low.length, cand.length);
    if (d <= max && sim >= 0.7) {
      if (!best || d < best.d || (d === best.d && cand.length > best.cand.length)) best = { cand, d };
    }
  }
  WORD_CACHE.set(low, best ? best.cand : '');
  return best ? matchCase(word, best.cand) : word;
}

function fixText(text) {
  let s = String(text || '');
  for (const [re, rep] of FIX_PHRASES) s = s.replace(re, m => matchCase(m, rep));
  return s.replace(/[A-Za-zÀ-ÿ]+/g, w => correctWord(w));
}

const ADMIN_CODE = 'BEHRING2026';
const MAX_SECONDS = 1800;
const STORE_PLAN = 'gb-admin-plan-v1';
const STORE_META = 'gb-admin-meta-v1';

const S = {
  file: null,
  url: '',
  name: '',
  size: 0,
  duration: 0,
  status: 'idle',
  chunks: [],
  transcript: '',
  plan: null,
  planURL: '',
  shortURL: '',
  photosPromise: null,
  site: "Via dell'Industria 11, Castelli Calepio",
  referente: 'Laura San Pellegrino',
  owner: 'Opera Guida Personale'
};

function toast(msg, isErr) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3200);
  setTimeout(() => el.remove(), 3600);
}

function download(name, content, type) {
  const blob = new Blob([content], { type: type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ============================================================
   Accesso responsabili
   ============================================================ */

function unlockUI() {
  $('#gate').hidden = true;
  $('#app').hidden = false;
  $('#logoutBtn').hidden = false;
}

function resetWorkspace() {
  if (S.url) { try { URL.revokeObjectURL(S.url); } catch (e) { } }
  S.file = null; S.url = ''; S.name = ''; S.size = 0; S.duration = 0; S.status = 'idle';
  S.chunks = []; S.transcript = ''; S.plan = null; S.planURL = ''; S.shortURL = ''; S.photosPromise = null;
  S.photosPromise = null;
  try { localStorage.removeItem(STORE_PLAN); } catch (e) { }
  try { $('#voiceFile').value = ''; } catch (e) { }
  $('#upEmpty').hidden = false; $('#upFilled').hidden = true;
  $('#drop').classList.remove('has-file');
  $('#prog').hidden = true; $('#trDetails').hidden = true;
  $('#result').classList.remove('on'); $('#summary').classList.remove('on');
  $('#aiBtn').style.display = 'none';
  $('#audio').removeAttribute('src'); $('#audio').load();
  updateVoiceUI();
}

function bindGate() {
  const form = $('#gateForm'), code = $('#gateCode'), err = $('#gateErr');
  if (sessionStorage.getItem('gb-admin') === 'ok') unlockUI();
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = code.value.trim().toUpperCase();
    if (v === ADMIN_CODE) {
      sessionStorage.setItem('gb-admin', 'ok');
      err.classList.remove('on');
      unlockUI();
      resetWorkspace();
      code.value = '';
    } else {
      err.classList.add('on');
      code.select();
      form.animate ? form.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 220 }) : null;
    }
  });
  $('#logoutBtn').addEventListener('click', () => {
    resetWorkspace();
    sessionStorage.removeItem('gb-admin');
    location.reload();
  });
}

/* ============================================================
   Upload e audio
   ============================================================ */

function buildMockBars() {
  const box = $('#mockBars');
  if (!box) return;
  const hs = [8, 14, 20, 12, 24, 18, 26, 10, 22, 16, 24, 12, 18, 26, 14, 20, 10, 22, 16, 12, 24, 18, 14, 20, 10, 16];
  box.innerHTML = hs.map(h => `<i style="height:${h}px;opacity:${(0.3 + h / 40).toFixed(2)}"></i>`).join('');
}

function updateVoiceUI() {
  const v = S;
  $('#vbName').textContent = v.name || 'vocale';
  const bits = [];
  if (v.duration) bits.push(fmt(v.duration));
  if (v.size) bits.push((v.size / 1024 / 1024).toFixed(1) + ' MB');
  bits.push('audio locale');
  $('#vbSub').textContent = bits.join(' · ');
  $('#aiBtn').disabled = v.status === 'loading';
  if (v.status === 'done') {
    $('#aiBtn').innerHTML = '<svg><use href="#i-refresh"/></svg> Rielabora';
    $('#aiNote').textContent = 'Guida pronta. Controlla il risultato qui sotto.';
  } else {
    $('#aiBtn').innerHTML = '<svg><use href="#i-spark"/></svg> Elabora con AI';
    $('#aiNote').textContent = 'La prima volta scarica il modello (≈75 MB). Poi resta in cache.';
  }
  const au = $('#audio');
  if (au) au.style.display = v.url ? '' : 'none';
}

function setProg(pct, label) {
  $('#progFill').style.width = Math.max(0, Math.min(100, pct)) + '%';
  $('#progText').textContent = label;
  $('#progPct').textContent = Math.round(Math.max(0, Math.min(100, pct))) + '%';
}

function onVoiceFile(file) {
  if (!file) return;
  if (!/^audio\//.test(file.type) && !/\.(mp3|ogg|oga|opus|m4a|wav|aac|amr)$/i.test(file.name || '')) {
    toast('Scegli un file audio (MP3, OGG, M4A, WAV).', true); return;
  }
  if (file.size > 90 * 1024 * 1024) { toast('Il file supera 90 MB: comprimilo o dividilo.', true); return; }
  if (S.plan && !confirm('Caricando un nuovo vocale la guida attuale viene sostituita. Continuare?')) return;

  if (S.url) URL.revokeObjectURL(S.url);
  S.file = file;
  S.name = file.name || 'vocale';
  S.size = file.size;
  S.url = URL.createObjectURL(file);
  S.duration = 0;
  S.status = 'loaded';
  S.chunks = []; S.transcript = ''; S.plan = null; S.planURL = ''; S.shortURL = ''; S.photosPromise = null;

  $('#upEmpty').hidden = true;
  $('#upFilled').hidden = false;
  $('#drop').classList.add('has-file');
  $('#aiBtn').style.display = '';
  $('#prog').hidden = true;
  $('#longWarn').classList.add('hide');
  $('#result').classList.remove('on');
  $('#summary').classList.remove('on');
  $('#trDetails').hidden = true;

  const a = $('#audio');
  a.onloadedmetadata = () => {
    S.duration = a.duration || 0;
    if (S.duration > MAX_SECONDS) {
      toast('Il vocale dura ' + fmt(S.duration) + ': il massimo è 30 minuti.', true);
    } else if (S.duration > 300) {
      $('#longWarn').classList.remove('hide');
    }
    updateVoiceUI();
  };
  a.src = S.url;
  updateVoiceUI();
}

/* ============================================================
   Whisper sul dispositivo
   ============================================================ */

const WORKER_SRC = `
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
env.allowLocalModels = false;
env.useBrowserCache = true;
let pipe = null;
self.onmessage = async (e) => {
  const d = e.data || {};
  const id = d.id;
  try {
    if (!pipe) {
      pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        quantized: true,
        progress_callback: (p) => self.postMessage({ id, type: 'progress', data: p })
      });
      self.postMessage({ id, type: 'ready' });
    }
    const out = await pipe(d.audio, {
      language: 'italian',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true
    });
    self.postMessage({ id, type: 'done', result: out });
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String((err && err.message) || err) });
  }
};
`;

let whisperWorker = null;
const jobs = new Map();
let jobSeq = 0;

function ensureWorker() {
  if (whisperWorker) return whisperWorker;
  const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
  whisperWorker = new Worker(url, { type: 'module' });
  whisperWorker.onmessage = ev => {
    const d = ev.data || {};
    const job = jobs.get(d.id);
    if (!job) return;
    if (d.type === 'progress' && job.onProgress) job.onProgress(d.data);
    else if (d.type === 'ready' && job.onReady) job.onReady();
    else if (d.type === 'done') { jobs.delete(d.id); job.resolve(d.result); }
    else if (d.type === 'error') { jobs.delete(d.id); job.reject(new Error(d.message || 'Errore del modello')); }
  };
  whisperWorker.onerror = ev => {
    const err = new Error(ev.message || 'Il modello AI non si è caricato');
    jobs.forEach(j => j.reject(err));
    jobs.clear();
  };
  return whisperWorker;
}

function runWhisper(audio, onProgress, onReady) {
  return new Promise((resolve, reject) => {
    const id = ++jobSeq;
    jobs.set(id, { resolve, reject, onProgress, onReady });
    try {
      ensureWorker().postMessage({ id, type: 'transcribe', audio }, [audio.buffer]);
    } catch (e) {
      jobs.delete(id);
      reject(e);
    }
  });
}

async function decodeTo16k(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('Audio non supportato in questo browser.');
  const ctx = new AC();
  let buf;
  try {
    const ab = await blob.arrayBuffer();
    buf = await new Promise((res, rej) => {
      const p = ctx.decodeAudioData(ab, res, rej);
      if (p && p.then) p.then(res).catch(rej);
    });
  } finally {
    ctx.close().catch(() => { });
  }
  const rate = 16000;
  const len = Math.max(1, Math.ceil(buf.duration * rate));
  const off = new OfflineAudioContext(1, len, rate);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return { audio: rendered.getChannelData(0), duration: buf.duration };
}

async function transcribeAll(audio, duration, onProgress) {
  const sr = 16000;
  const CHUNK = 300 * sr;
  const n = Math.max(1, Math.ceil(audio.length / CHUNK));
  const out = [];
  for (let i = 0; i < n; i++) {
    const slice = audio.slice(i * CHUNK, Math.min((i + 1) * CHUNK, audio.length));
    const copy = new Float32Array(slice.length);
    copy.set(slice);
    const res = await runWhisper(copy,
      p => onProgress('model', p, i, n),
      () => onProgress('run', null, i, n)
    );
    const off = i * 300;
    const localDur = slice.length / sr;
    let ch = (res && res.chunks && res.chunks.length ? res.chunks : [{ text: res && res.text || '', timestamp: [0, localDur] }])
      .map(c => ({
        text: String(c.text || '').trim(),
        start: (Array.isArray(c.timestamp) && c.timestamp[0] != null ? c.timestamp[0] : 0) + off,
        end: (Array.isArray(c.timestamp) && c.timestamp[1] != null ? c.timestamp[1] : localDur) + off
      }))
      .filter(c => c.text);
    if (!ch.length && res && res.text) ch = [{ text: String(res.text).trim(), start: off, end: off + localDur }];
    out.push(...ch);
    onProgress('done', { part: i + 1, n }, i, n);
  }
  return out;
}

async function runAI() {
  if (!S.file) { toast('Prima carica un vocale.', true); return; }
  if (S.status === 'loading') return;
  S.status = 'loading';
  $('#prog').hidden = false;
  $('#aiBtn').disabled = true;
  setProg(3, 'Preparo l\'audio…');
  try {
    const { audio, duration } = await decodeTo16k(S.file);
    if (duration > MAX_SECONDS) throw new Error('Il vocale supera i 30 minuti.');
    S.duration = duration;
    const chunks = await transcribeAll(audio, duration, (phase, data, i, n) => {
      if (phase === 'model') {
        const p = data;
        if (p && p.status === 'progress' && p.total) {
          const pct = Math.min(36, 4 + (p.loaded / p.total) * 32);
          const nm = String(p.file || '').split('/').pop();
          setProg(pct, 'Scarico il modello AI… ' + (nm || ''));
        } else if (p && p.status === 'done') {
          setProg(38, 'Modello pronto…');
        }
      } else if (phase === 'run') {
        setProg(40 + (i / n) * 55, 'Trascrivo… parte ' + (i + 1) + ' di ' + n);
      } else if (phase === 'done') {
        setProg(42 + (data.part / data.n) * 55, 'Trascritto ' + data.part + ' di ' + data.n);
      }
    });
    S.chunks = chunks;
    S.transcript = fixText(chunks.map(c => c.text).join(' ').replace(/\s+/g, ' ').trim());
    S.chunks = chunks.map(c => ({ ...c, text: fixText(c.text) }));
    renderTranscript();
    const plan = buildPlan(S.transcript, {
      site: S.site, referente: S.referente, owner: S.owner, updated: itDate(todayISO())
    }, S.chunks);
    if (!plan) {
      S.status = 'error';
      toast('Non ho riconosciuto attività o regole. Controlla la trascrizione o incolla il testo.', true);
      setProg(100, 'Nessuna attività riconosciuta');
      return;
    }
    S.status = 'done';
    S.plan = plan;
    S.planURL = ''; S.shortURL = '';
    renderPlan(plan);
    S.photosPromise = autoPhotos(S.plan).catch(() => 0);
    setProg(100, 'Guida pronta');
    updateVoiceUI();
    toast(plan.days.reduce((a, d) => a + d.steps.length, 0) + plan.monthly.length + ' attività · ' + plan.days.length + ' giorni');
    setTimeout(() => $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
  } catch (e) {
    S.status = 'error';
    setProg(0, 'Errore: ' + (e.message || 'elaborazione non riuscita'));
    toast('Non riesco a elaborare: ' + (e.message || 'errore') + '. Puoi incollare la trascrizione.', true);
  } finally {
    $('#aiBtn').disabled = false;
    updateVoiceUI();
  }
}

function renderTranscript() {
  if (!S.chunks.length) { $('#trDetails').hidden = true; return; }
  $('#trDetails').hidden = false;
  const n = S.chunks.length;
  $('#trCount').textContent = '· ' + n + (n === 1 ? ' passaggio' : ' passaggi');
  $('#trBody').innerHTML = S.chunks.map(c => `<p><span class="tr-time">${fmt(c.start)}</span>${esc(c.text)}</p>`).join('');
}

/* ============================================================
   Estrazione: dal testo alla guida
   ============================================================ */

const RULE_LEX = {
  prodotti: ['prodotto', 'prodotti', 'ecolabel', 'sapone', 'detersivo', 'detersivi', 'detergente', 'detergenti', 'carta igienica', 'carta asciugamani', 'materiale di consumo', 'fornitura', 'fornire', 'dispenser', 'sacchi'],
  chiavi: ['chiave', 'chiavi', 'badge', 'allarme', 'registro', 'firma', 'firme', 'timbratura', 'timbrare', 'documenti', 'procedura', 'procedure', 'primo accesso', 'cancello', 'cancellino', 'portone', 'portineria', 'codice', 'disarmare', 'armare', 'tesserino', 'accesso', 'entrata'],
  sicurezza: ['sicurezza', 'rischio', 'rischi', 'formazione', 'procedure', 'chimico', 'chimici', 'elettrico', 'elettrici', 'cella frigorifera', 'celle frigo'],
  dpi: ['dpi', 'guanti', 'mascherina', 'occhiali', 'scarpe', 'antiscivolo', 'protezione', 'casco', 'otoprotettori', 'dispositivo', 'dispositivi'],
  attrezzature: ['attrezzatura', 'attrezzature', 'lavasciuga', 'lavamoquette', 'carrello', 'carrelli', 'mocio', 'aspirapolvere', 'scopa', 'scopino', 'secchio', 'secchi', 'ripostiglio', 'deposito', 'armadio', 'macchinario', 'monospazzola', 'idropulitrice']
};

const ACTS = [
  ['Svuota i cestini', /cestin/],
  ['Togli la polvere', /polver|spolver/],
  ['Scopa il pavimento', /scopat|spazzare|spazzat[oa]\b/],
  ['Lava il pavimento', /lavagg\w*[^.]{0,12}paviment|lavare il pavimento|pavimento/],
  ['Lava i sanitari', /sanitar|\bbagn[oi]\b/],
  ['Lava le piastrelle', /piastrell/],
  ['Pulisci le impronte dai vetri', /impront/],
  ['Togli le ragnatele', /ragnatel|deragn/],
  ['Pulisci i tavoli', /tavol/],
  ['Pulisci le sedie', /sedi[ea]/],
  ['Pulisci il microonde', /microonde/],
  ['Pulisci la macchinetta del caffè', /macchinetta|macchina del caff/],
  ['Pulisci gli armadietti', /armadiett/],
  ['Pulisci il corrimano', /corrimano/],
  ['Pulisci l\'ascensore', /ascensor/],
  ['Pulisci le porte', /port[ae]\b/],
  ['Porta via la spazzatura', /spazzatur|rifiut|immondiz|differenziat/],
  ['Rifornisci carta e sapone', /riforn|dispenser|carta igienica|sapone/],
  ['Controlla', /controll/]
];

const PLACES = [
  [/ufficio (?:di|del|della|dello|dei|degli)?\s*([a-zà-ù]+)/i, m => 'Ufficio ' + cap(m[1]), 'ufficio'],
  [/bagno delle donne|bagni delle donne/i, () => 'Bagno donne', 'bagno'],
  [/bagno degli uomini|bagni degli uomini/i, () => 'Bagno uomini', 'bagno'],
  [/\bbagn[oi]\b/i, () => 'Bagni', 'bagno'],
  [/\bcorridoio?\b/i, () => 'Corridoi', 'corridoio'],
  [/\bmensa\b/i, () => 'Mensa', 'mensa'],
  [/\bspogliatoio?\b/i, () => 'Spogliatoi', 'spogliatoio'],
  [/\bmagazzino\b/i, () => 'Magazzino', 'magazzino'],
  [/\blaboratorio\b/i, () => 'Laboratorio', 'laboratorio'],
  [/\binfermeria\b/i, () => 'Infermeria', 'infermeria'],
  [/sala riunioni|\briunioni\b/i, () => 'Sala riunioni', 'riunioni'],
  [/\breception\b|\bportineria\b/i, () => 'Reception', 'ingresso'],
  [/\batrio\b|\bingresso\b|\bentrata\b/i, () => 'Ingresso', 'ingresso'],
  [/\bscal[ae]\b/i, () => 'Scale', 'scala'],
  [/\bascensore\b/i, () => 'Ascensore', 'ascensore'],
  [/pausa caff|macchinetta|macchina del caff/i, () => 'Pausa caffè', 'caffe'],
  [/\bcapannone\b/i, () => 'Capannone', 'magazzino'],
  [/\bcortile\b|\besterni\b|\bparcheggio\b/i, () => 'Esterni', 'ingresso'],
  [/\bufficio\b|\buffici\b/i, () => 'Uffici', 'ufficio']
];

function ruleCat(text) {
  const t = ' ' + norm(text) + ' ';
  let best = null, bv = 0;
  for (const cat of Object.keys(RULE_LEX)) {
    let v = 0;
    for (const w of RULE_LEX[cat]) if (t.includes(' ' + norm(w) + ' ')) v += w.includes(' ') ? 2 : 1;
    if (v > bv) { bv = v; best = cat; }
  }
  return bv >= 1 ? best : null;
}

function taskCat(text) {
  const t = norm(text);
  if (/spazzatur|rifiut|immondiz|differenziat|macchinetta|pausa caff/.test(t)) return 'vizi';
  if (/orario|fascia|turno|pausa|straordinari|settimana|mensile|una volta|ogni mese/.test(t)) return 'orari';
  return 'giro';
}

function detectDay(text) {
  const t = norm(text);
  if (/\bmercoledi\b/.test(t)) return 'mer';
  if (/\bmartedi\b|\bgiovedi\b/.test(t)) return 'mar';
  if (/\blunedi\b/.test(t)) return 'lun';
  if (/\bmensile\b|una volta al mese|ogni mese|fine mese|trimestrale/.test(t)) return 'mes';
  return null;
}

function timeRange(text) {
  const t = text.replace(/(\d)[.:](\d{2})/g, (m, h, mi) => h + ':' + mi);
  const m = t.match(/(?:dalle?|dalla)\s*(\d{1,2})(?::(\d{2}))?\s*(?:alle?|a|–|-)\s*(\d{1,2})(?::(\d{2}))?/i);
  if (!m) {
    const m2 = t.match(/\b(\d{1,2}):(\d{2})\s*(?:–|-|alle?)\s*(\d{1,2}):(\d{2})\b/);
    if (!m2) return null;
    return { start: pad(+m2[1]) + ':' + m2[2], end: pad(+m2[3]) + ':' + m2[4] };
  }
  return { start: pad(+m[1]) + ':' + (m[2] || '00'), end: pad(+m[3]) + ':' + (m[4] || '00') };
}

function placeOf(text) {
  const named = text.match(/ufficio (?:di|della|dello|dei|degli)\s*([a-zà-ù]+)/i);
  if (named) return { idx: -1, title: 'Ufficio ' + cap(named[1]), img: 'ufficio' };
  let best = null;
  for (const [re, titleFn, img] of PLACES) {
    const m = text.match(re);
    if (!m) continue;
    const idx = m.index;
    if (!best || idx < best.idx) best = { idx, title: titleFn(m), img };
  }
  if (best) return best;
  return null;
}

function floorOf(text) {
  const m = text.match(/\b(piano terra|primo piano|secondo piano|terzo piano|quarto piano|\d+\s*°?\s*piano)\b/i);
  return m ? cap(m[1].replace(/\s+/g, ' ')) : '';
}

function minutesOf(text) {
  const m = text.match(/(\d{1,3})\s*minut/i);
  if (m) return Math.min(600, +m[1]);
  if (/un['’]ora e mezza|ora e mezza/i.test(text)) return 90;
  if (/mezz['’]ora/i.test(text)) return 30;
  if (/\bun['’]ora\b/i.test(text)) return 60;
  return 0;
}

function actsOf(text) {
  const out = [];
  for (const [label, re] of ACTS) if (re.test(text) && !out.includes(label)) out.push(label);
  if (!out.length) {
    const n = norm(text);
    if (/pulir|pulisc|pulit|pulizia/.test(n)) out.push('Pulisci');
    else if (/lavagg|lav[ao]|lavare/.test(n)) out.push('Lava');
    else if (/controll/.test(n)) out.push('Controlla');
    else out.push('Completa il lavoro');
  }
  return out.slice(0, 7);
}

/* ============================================================
   Sintesi intelligente: passi chiari + parole chiave
   ============================================================ */

const KEYWORD_LIST = new Set((VOCAB.join(' ') + ' ' +
  'cestini spolvero polvere pavimento pavimenti sanitari piastrelle macchinetta caffè caffe ' +
  'spazzatura rifiuti chiavi allarme guanti scarpe prodotti detersivo detersivi lavasciuga ' +
  'attrezzature tavoli sedie vetri ragnatele microonde armadietti corrimano ascensore ' +
  'portineria badge ecolabel dispenser sapone carta riunioni ufficio uffici bagni bagno ' +
  'corridoio corridoi mensa spogliatoi spogliatoio magazzino cortile scale scala reception ' +
  'ingresso porte porta scrivanie scrivania piani piano').split(/\s+/));

function keywordsOf(text, acts, loc) {
  const source = [text, (acts || []).join(' '), loc || ''].join(' ');
  const seen = new Set();
  const out = [];
  String(source).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ').split(/\s+/).forEach(w => {
      if (w.length < 4 || seen.has(w)) return;
      if (!KEYWORD_LIST.has(w) && !KEYWORD_LIST.has(w.replace(/[aeiou]$/, ''))) return;
      seen.add(w); out.push(w);
    });
  return out.slice(0, 8);
}

function summarizeStep(text, acts, loc) {
  let steps = (acts || []).filter(Boolean);
  const generic = new Set(['pulisci', 'lava', 'controlla', 'completa il lavoro']);
  if (!steps.length || (steps.length === 1 && generic.has(String(steps[0]).toLowerCase().trim()))) {
    const raw = stripNote(text) || String(text || '');
    steps = [raw.replace(/^(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|oggi|domani)\s+/i, '')];
  }
  steps = steps.slice(0, 10).map(s => String(s).replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim()).filter(Boolean);
  const lines = steps.map((s, i) => (i + 1) + '. ' + cap(s) + '.');
  const kw = keywordsOf(text, steps, loc);
  return 'Cosa devi fare:\n' + lines.join('\n') +
    (loc ? '\nDove: ' + cap(loc) + '.' : '') +
    (kw.length ? '\nParole chiave: ' + kw.join(', ') + '.' : '');
}

function cleanText(t) {
  let s = String(t || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(?:e\s+)?(?:poi|dopo|quindi|allora|adesso|ora|ok|okay|eh|e)\s+/i, '');
  s = s.replace(/^(?:mi raccomando|ricordati|ricordate|ricorda)\s+(?:di\s+|che\s+)?/i, '');
  s = s.replace(/[,;:]+([.!?])$/, '$1');
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1);
  if (s && !/[.!?]$/.test(s)) s += '.';
  return s;
}

function isTaskLike(text) {
  const n = norm(text);
  if (n.split(' ').length < 5) return false;
  if (ACTS.some(([, re]) => re.test(text))) return true;
  if (/(pulir|pulizia|lavagg|spazz|scopat|polver|svuot|sanific|disinfett)/.test(n)) return true;
  return !!placeOf(text);
}

function splitText(text) {
  const full = String(text || '').replace(/\s+/g, ' ').trim();
  const sentences = [];
  const re = /([^.!?…]+[.!?…]+|[^.!?…]+$)/g;
  let m;
  while ((m = re.exec(full)) !== null) {
    if (!m[1].trim()) continue;
    const parts = m[1].split(/\s+(?=(?:poi|dopo|quindi|allora|però|invece)\s+)/i);
    for (const p of parts) {
      if (p.trim()) sentences.push(p.trim());
    }
  }
  const out = [];
  for (const p of sentences) {
    if (p.length <= 260) { out.push(p); continue; }
    let buf = '';
    for (const c of p.split(/,\s*/)) {
      if (buf && (buf + ', ' + c).length > 230) { out.push(buf + ','); buf = c; }
      else buf = buf ? buf + ', ' + c : c;
    }
    if (buf) out.push(buf);
  }
  return out;
}

function findChunk(text, chunks) {
  if (!Array.isArray(chunks) || !chunks.length) return null;
  const words = norm(text).split(/\s+/).filter(w => w.length > 3);
  if (!words.length) return null;
  let best = null, bestScore = 0;
  for (const c of chunks) {
    const cw = norm(c.text).split(/\s+/);
    let hit = 0;
    for (const w of words) if (cw.indexOf(w) >= 0) hit++;
    const score = hit / words.length;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

/* ============================================================
   Foto suggerite dall'AI per i compiti senza foto
   ============================================================ */

const PHOTO_MAP = [
  [/macchinetta|macchina del caff|caff[eè]/, 'coffee machine'],
  [/bagno|sanitar|wc/, 'bathroom cleaning'],
  [/corridoio/, 'corridor cleaning'],
  [/mensa/, 'canteen cleaning'],
  [/ufficio|scrivania/, 'office cleaning'],
  [/spogliatoio/, 'locker room cleaning'],
  [/magazzino/, 'warehouse shelves'],
  [/scala|scale/, 'stairs cleaning'],
  [/ascensore/, 'elevator cleaning'],
  [/paviment|lavagg/, 'floor cleaning'],
  [/cestin/, 'waste bin'],
  [/vetr|impront/, 'window cleaning'],
  [/lavasciuga/, 'floor scrubber'],
  [/prodott|detersiv|ecolabel|sapone/, 'cleaning products'],
  [/chiav|badge|allarme/, 'keys'],
  [/guant|mascherin|dpi|scarpe/, 'safety gloves'],
  [/spazzatur|rifiut/, 'trash bag'],
  [/tavol/, 'table cleaning'],
  [/microonde/, 'microwave'],
  [/riunion/, 'meeting room cleaning'],
  [/reception|portineria|ingresso/, 'reception desk'],
  [/cortile|estern/, 'courtyard cleaning'],
  [/capannone|industri/, 'industrial cleaning'],
  [/polver|spolver/, 'dusting'],
  [/ragnatel|deragn/, 'cobweb']
];

function photoQuery(step) {
  const hay = norm([step.t, step.desc, (step.acts || []).join(' '), step.loc].join(' '));
  for (const [re, q] of PHOTO_MAP) if (re.test(hay)) return q;
  const words = norm(step.t + ' ' + (step.desc || '')).split(/\s+/).filter(w => w.length > 4).slice(0, 3);
  return (words.join(' ') || 'cleaning') + ' cleaning';
}

async function findCommonsPhoto(step) {
  const q = photoQuery(step);
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
    encodeURIComponent(q + ' filetype:bitmap') + '&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*';
  const r = await fetch(url);
  if (!r.ok) throw new Error('commons ' + r.status);
  const j = await r.json();
  const pages = j && j.query && j.query.pages;
  if (!pages) return null;
  for (const p of Object.values(pages)) {
    const info = p.imageinfo && p.imageinfo[0];
    const u = info && (info.thumburl || info.url);
    if (u && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(u)) return { url: u, cap: 'Foto suggerita' };
  }
  return null;
}

async function autoPhotos(plan) {
  if (!plan) return 0;
  let added = 0;
  const steps = [];
  (plan.days || []).forEach(d => (d.steps || []).forEach(s => steps.push(s)));
  (plan.monthly || []).forEach(s => steps.push(s));
  for (const s of steps) {
    if ((s.photos || []).length) continue;
    if (added >= 20) break;
    try {
      const p = await findCommonsPhoto(s);
      if (p) { s.photos = [p]; added++; }
    } catch (e) { }
  }
  if (added) {
    if (S.plan !== plan) return added;
    S.planURL = ''; S.shortURL = '';
    renderPlan(plan);
    toast(added + (added === 1 ? ' foto suggerita dall\'AI' : ' foto suggerite dall\'AI'));
  }
  return added;
}

function buildPlan(text, meta, chunks) {
  const parts = splitText(fixText(text));
  if (!parts.length) return null;

  const days = {
    lun: { id: 'lun', label: 'Lunedì', short: 'Lun', sub: 'piano di lavoro', start: '06:00', end: '11:30', steps: [] },
    mar: { id: 'mar', label: 'Martedì e giovedì', short: 'Mar–Gio', sub: 'piano di lavoro', start: '06:00', end: '10:30', steps: [] },
    mer: { id: 'mer', label: 'Mercoledì', short: 'Mer', sub: 'piano di lavoro', start: '06:00', end: '12:30', steps: [] }
  };
  const monthly = [];
  const rules = { prodotti: [], chiavi: [], sicurezza: [], dpi: [], attrezzature: [] };
  const general = { giro: [], orari: [], vizi: [] };
  let current = 'lun';

  for (const raw of parts) {
    const textS = cleanText(raw);
    if (textS.replace(/[^\p{L}\p{N}]+/gu, '').length < 12) continue;

    const dm = detectDay(textS);
    if (dm) current = dm;

    const cat = ruleCat(textS);
    if (cat) {
      const target = rules[cat];
      if (!target.some(x => norm(x) === norm(textS))) target.push(textS);
      continue;
    }

    const tr = timeRange(textS);
    if (tr && current !== 'mes') {
      days[current].start = tr.start;
      days[current].end = tr.end;
    }
    if (current === 'mes' && tr) continue;

    const catLabel = taskCat(textS);
    if (catLabel === 'vizi' && !general.vizi.some(x => norm(x) === norm(textS))) general.vizi.push(textS);

    if (!isTaskLike(textS)) continue;

    const place = placeOf(textS);
    const floor = floorOf(textS);
    let title = place ? place.title : '';
    let img = place ? place.img : 'ufficio';
    if (catLabel === 'vizi') {
      if (/macchinetta|macchina del caff|pausa caff/.test(norm(textS))) { title = 'Pulizia macchinetta'; img = 'caffe'; }
      else if (place && /^ufficio/i.test(place.title)) { title = 'Pulizia ' + place.title; img = 'ufficio'; }
      else { title = 'Spazzatura'; img = 'ingresso'; }
    }
    if (!title) {
      title = textS
        .replace(/^(?:c['’]è|ci sono|abbiamo|andiamo|dobbiamo|facciamo|si fa|in più|inoltre)\s+/i, '')
        .split(/[,;:]/)[0]
        .replace(/\.$/, '');
      if (title.length > 64) title = title.slice(0, 64).replace(/\s+\S*$/, '') + '…';
      title = cap(title);
      if (/cestin/.test(textS)) img = 'ufficio';
      if (/bagno|sanitar/.test(norm(textS))) img = 'bagno';
      if (/mensa/.test(norm(textS))) img = 'mensa';
    }
    const loc = floor || (place ? place.title : (catLabel === 'orari' ? 'Orario' : catLabel === 'vizi' ? 'Attenzione' : 'Giro'));
    const acts = actsOf(textS);
    const chunk = findChunk(textS, chunks);
    const step = {
      t: title,
      loc,
      min: minutesOf(textS),
      img,
      desc: summarizeStep(textS, acts, loc),
      acts,
      note: 'Dal vocale · ' + (catLabel === 'orari' ? 'Orari e frequenza' : catLabel === 'vizi' ? 'Vizi e spazzatura' : 'Giro') + ' · «' + textS + '»',
      audioStart: chunk ? Math.max(0, Number(chunk.start) || 0) : 0,
      audioEnd: chunk ? Math.max(0, Number(chunk.end) || 0) : 0,
      photos: [],
      audios: []
    };

    const target = current === 'mes' ? monthly : days[current].steps;
    if (!target.some(x => norm(x.t) === norm(step.t) && norm(x.note) === norm(step.note))) target.push(step);
  }

  const dayList = ['lun', 'mar', 'mer'].map(id => days[id]).filter(d => d.steps.length);
  if (!dayList.length && !monthly.length) return null;

  const orari = dayList.map(d => [d.label, d.start + ' – ' + d.end, hours(d.start, d.end)]);
  if (monthly.length) orari.push(['Mensile', 'una volta al mese', '—']);
  general.orari = orari;
  dayList.forEach(d => {
    const titles = [...new Set(d.steps.map(s => s.t))];
    if (titles.length) general.giro.push(d.label + ': ' + titles.join(', '));
  });
  if (monthly.length) general.giro.push('Mensile: ' + [...new Set(monthly.map(s => s.t))].join(', '));

  return {
    v: 2,
    meta: meta || {},
    originalAudio: '',
    generale: {
      giro: general.giro.slice(0, 8),
      orari,
      vizi: general.vizi.slice(0, 12)
    },
    days: dayList,
    monthly,
    rules: {
      prodotti: rules.prodotti.slice(0, 12),
      chiavi: rules.chiavi.slice(0, 12),
      sicurezza: rules.sicurezza.slice(0, 12),
      dpi: rules.dpi.slice(0, 12),
      attrezzature: rules.attrezzature.slice(0, 12)
    },
    rulePhotos: { prodotti: [], chiavi: [], sicurezza: [], dpi: [], attrezzature: [] },
    ruleAudios: { prodotti: [], chiavi: [], sicurezza: [], dpi: [], attrezzature: [] }
  };
}

function hours(a, b) {
  const toM = t => { const p = String(t || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); };
  const m = Math.max(0, toM(b) - toM(a));
  return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + pad(m % 60) : '');
}

/* ============================================================
   Piano v2: parte generale, compiti spiegati, foto e vocali
   ============================================================ */

const PLAN_RULE_KEYS = ['prodotti', 'chiavi', 'sicurezza', 'dpi', 'attrezzature'];

function mediaArr(a) {
  if (!Array.isArray(a)) return [];
  return a.map(x => typeof x === 'string' ? { url: x, cap: '', mime: '' } : { url: (x && x.url) || '', cap: (x && x.cap) || '', mime: (x && x.mime) || '' })
    .filter(x => x.url);
}

function arrV2(x) {
  if (Array.isArray(x)) return x.map(v => typeof v === 'string' ? v : (v && v.t) || '').filter(Boolean);
  if (x && Array.isArray(x.items)) return x.items.filter(Boolean);
  return [];
}

function normStepV2(s) {
  s = s || {};
  return {
    t: s.t || 'Attività',
    loc: s.loc || '',
    min: Math.max(0, Number(s.min) || 0),
    img: s.img || 'ufficio',
    desc: s.desc || stripNote(s.note) || '',
    audioStart: Math.max(0, Number(s.audioStart) || 0),
    audioEnd: Math.max(0, Number(s.audioEnd) || 0),
    acts: Array.isArray(s.acts) && s.acts.length ? s.acts.slice(0, 12) : ['Completato'],
    note: s.note || '',
    photos: mediaArr(s.photos),
    audios: mediaArr(s.audios)
  };
}

function normalizePlanV2(plan) {
  if (!plan) return null;
  const p = JSON.parse(JSON.stringify(plan));
  p.v = 2;
  p.meta = p.meta || {};
  p.originalAudio = p.originalAudio || '';
  const r = p.rules || {};
  const g = p.generale || {};
  p.generale = {
    giro: Array.isArray(g.giro) ? g.giro : [],
    orari: Array.isArray(g.orari) ? g.orari : (Array.isArray(r.orari) ? r.orari : []),
    vizi: Array.isArray(g.vizi) ? g.vizi : []
  };
  p.rules = {};
  PLAN_RULE_KEYS.forEach(k => { p.rules[k] = arrV2(k === 'sicurezza' ? (r.sicurezza || r.rischi) : r[k]); });
  p.rulePhotos = p.rulePhotos || {};
  p.ruleAudios = p.ruleAudios || {};
  PLAN_RULE_KEYS.forEach(k => {
    p.rulePhotos[k] = mediaArr(p.rulePhotos[k] || (r[k] && r[k].photos));
    p.ruleAudios[k] = mediaArr(p.ruleAudios[k] || (r[k] && r[k].audios));
  });
  p.days = (p.days || []).map(d => ({
    id: d.id, label: d.label || 'Giorno', short: d.short || d.label || 'Giorno',
    sub: d.sub || 'piano di lavoro', start: d.start || '', end: d.end || '',
    steps: (d.steps || []).map(normStepV2)
  })).filter(d => d.steps.length);
  p.monthly = (p.monthly || []).map(normStepV2);
  return p;
}

/* ============================================================
   Risultato e condivisione
   ============================================================ */

function renderPlan(plan) {
  plan = normalizePlanV2(plan);
  if (!plan) return;
  S.plan = plan;
  const tasks = plan.days.reduce((a, d) => a + d.steps.length, 0) + plan.monthly.length;
  const rules = PLAN_RULE_KEYS.reduce((a, k) => a + plan.rules[k].length, 0);
  try { localStorage.setItem(STORE_PLAN, JSON.stringify(plan)); } catch (e) { }
  $('#result').classList.add('on');
  $('#summary').classList.add('on');
  $('#sumTitle').textContent = 'Guida pronta';
  $('#sumSub').textContent = tasks + ' attività · ' + plan.days.length + (plan.days.length === 1 ? ' giorno' : ' giorni') + ' · ' + rules + (rules === 1 ? ' regola' : ' regole');
  $('#resultSub').textContent = [plan.meta.site, plan.meta.referente ? 'referente ' + plan.meta.referente : '', plan.meta.updated ? 'aggiornata il ' + plan.meta.updated : ''].filter(Boolean).join(' · ');

  $('#stats').innerHTML =
    `<div class="statp"><b>${plan.days.length}</b><span>${plan.days.length === 1 ? 'giorno' : 'giorni'}</span></div>` +
    `<div class="statp"><b>${tasks}</b><span>attività</span></div>` +
    `<div class="statp"><b>${rules}</b><span>${rules === 1 ? 'regola' : 'regole'}</span></div>` +
    `<div class="statp"><b>${plan.monthly.length}</b><span>mensili</span></div>`;

  let html = '';
  html += `<div class="pgroup pgen"><div class="pgroup-head"><h3>Parte generale</h3><span>Giro · orari · attenzioni del cliente</span></div>` +
    `<div class="gprev-grid">${gprev('giro', 'Giro', plan.generale.giro, 'list')}${gprev('orari', 'Orari e frequenza', plan.generale.orari, 'table')}${gprev('vizi', 'Attenzioni del cliente', plan.generale.vizi, 'list')}</div></div>`;
  plan.days.forEach(d => {
    html += `<div class="pgroup"><div class="pgroup-head"><h3>${esc(d.label)}</h3><span>${d.steps.length} attività · ${esc(d.start)}–${esc(d.end)}</span><button class="btn ghost sm padd" type="button" data-day="${esc(d.id)}">+ Compito</button></div>`;
    html += d.steps.map((s, i) => taskPreview(s, d.id, i)).join('');
    html += '</div>';
  });
  if (plan.monthly.length) {
    html += `<div class="pgroup"><div class="pgroup-head"><h3>Servizio mensile</h3><span>${plan.monthly.length} attività</span><button class="btn ghost sm padd" type="button" data-day="mes">+ Compito</button></div>` +
      plan.monthly.map((s, i) => taskPreview(s, 'mes', i)).join('') + '</div>';
  }
  html += `<div class="pgroup"><div class="pgroup-head"><h3>Regolamenti</h3><span>Prodotti · chiavi · sicurezza · DPI · attrezzature</span></div><div class="rules-preview">` +
    rulePreview('prodotti', 'Prodotti e materiali', plan) +
    rulePreview('chiavi', 'Chiavi e accessi', plan) +
    rulePreview('sicurezza', 'Sicurezza', plan) +
    rulePreview('dpi', 'DPI', plan) +
    rulePreview('attrezzature', 'Attrezzature', plan) +
    `</div></div>`;
  $('#preview').innerHTML = html;
}

function gprev(key, title, arr, kind) {
  let body = '';
  if (kind === 'table') {
    const rows = (arr || []).map(r => Array.isArray(r) ? r : [r, '', '']);
    body = rows.length
      ? `<table class="gtable"><thead><tr><th>Giorno</th><th>Fascia</th><th>Ore</th></tr></thead><tbody>` + rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1] || '')}</td><td>${esc(r[2] || '')}</td></tr>`).join('') + `</tbody></table>`
      : '<div class="empty-r">Nessuna indicazione.</div>';
  } else {
    body = arr && arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="empty-r">Nessuna indicazione.</div>';
  }
  return `<div class="gprev"><div class="gprev-head"><h4>${esc(title)}</h4><button class="pedit" type="button" data-g="${esc(key)}">Modifica</button></div>${body}</div>`;
}

function taskPreview(s, day, idx) {
  const acts = (s.acts || []).slice(0, 6);
  const photos = (s.photos || []).slice(0, 3);
  return `<div class="ptask" data-day="${esc(day)}" data-idx="${idx}"><div class="pt-top"><b>${esc(s.t)}</b><span class="pt-actions">${s.min ? `<span class="pt-min">~${s.min} min</span>` : ''}<button class="pedit" type="button" data-day="${esc(day)}" data-idx="${idx}">Modifica</button></span></div>` +
    (s.desc ? `<p class="pt-desc">${esc(s.desc)}</p>` : '') +
    `<div class="pt-chips">${acts.map(a => `<span>${esc(a)}</span>`).join('')}</div>` +
    (photos.length ? `<div class="pt-photos">${photos.map(p => `<img src="${esc(p.url)}" alt="">`).join('')}${s.photos.length > 3 ? `<span>+${s.photos.length - 3}</span>` : ''}</div>` : '') +
    ((s.audios || []).length ? `<div class="pt-media">Vocale allegato · ${s.audios.length}</div>` : '') + `</div>`;
}

function rulePreview(key, title, plan) {
  const arr = plan.rules[key] || [], ph = plan.rulePhotos[key] || [], au = plan.ruleAudios[key] || [];
  return `<div class="rprev"><div class="rprev-head"><h4>${esc(title)}</h4><button class="pedit" type="button" data-g="${esc(key)}">Modifica</button></div>` +
    (arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="empty-r">Nessuna indicazione nel vocale.</div>') +
    (ph.length ? `<div class="pt-photos">${ph.slice(0, 3).map(p => `<img src="${esc(p.url)}" alt="">`).join('')}${ph.length > 3 ? `<span>+${ph.length - 3}</span>` : ''}</div>` : '') +
    (au.length ? `<div class="pt-media">Vocale · ${au.length}</div>` : '') + `</div>`;
}

const SHORT_CACHE = new Map();

function encodePlan(plan) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(plan));
}

function urlForPlan(plan) {
  return new URL('guida7.html', location.href).href + '#d=' + encodePlan(plan);
}

function planURL() {
  if (!S.plan) return '';
  if (!S.planURL) S.planURL = urlForPlan(S.plan);
  return S.planURL;
}

function compactPlan(plan, noteLen) {
  const p = JSON.parse(JSON.stringify(plan));
  for (const d of p.days || []) for (const s of d.steps || []) if (s.note) s.note = noteLen ? s.note.slice(0, noteLen) : '';
  for (const s of p.monthly || []) if (s.note) s.note = noteLen ? s.note.slice(0, noteLen) : '';
  for (const k of ['prodotti', 'chiavi', 'sicurezza', 'dpi', 'attrezzature']) if (p.rules && Array.isArray(p.rules[k])) p.rules[k] = p.rules[k].slice(0, 8);
  if (p.meta) delete p.meta.owner;
  return p;
}

async function shortenLink(url) {
  if (!url || url.length > 4990) return '';
  if (SHORT_CACHE.has(url)) return SHORT_CACHE.get(url);
  for (const host of ['is.gd', 'v.gd']) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch('https://' + host + '/create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'format=json&url=' + encodeURIComponent(url),
        signal: ctrl.signal
      });
      clearTimeout(tm);
      if (!r.ok) continue;
      const j = await r.json();
      const s = j && j.shorturl;
      if (typeof s === 'string' && /^https:\/\/(is|v)\.gd\/[A-Za-z0-9]+$/.test(s)) {
        SHORT_CACHE.set(url, s);
        return s;
      }
    } catch (e) { }
  }
  return '';
}

async function ensureOriginalAudio() {
  if (!S.plan || S.plan.originalAudio || !S.file) return;
  try {
    const url = await uploadHost(S.file, S.name || 'vocale.mp3');
    S.plan.originalAudio = url;
    S.planURL = ''; S.shortURL = '';
  } catch (e) {
    toast('Non riesco a caricare il vocale originale: il dipendente sentirà solo i vocali allegati.', true);
  }
}

async function buildShareURL() {
  if (!S.plan) return { url: '', short: '', compacted: false, tooLong: true };
  await ensureOriginalAudio();
  await (S.photosPromise || Promise.resolve(0));
  let url = planURL();
  let compacted = false;
  if (url.length > 4990) {
    for (const lim of [120, 90, 60, 0]) {
      const c = urlForPlan(compactPlan(S.plan, lim));
      if (c.length <= 4990) { url = c; compacted = true; break; }
    }
  }
  const tooLong = url.length > 4990;
  const short = tooLong ? '' : await shortenLink(url);
  return { url, short, compacted, tooLong };
}

async function openShare() {
  if (!S.plan) { toast('Prima elabora un vocale.', true); return; }
  S.shortURL = '';
  $('#shareUrl').value = planURL();
  $('#linkLen').textContent = 'Preparo il link per il dipendente…';
  $('#linkLen').classList.remove('warn');
  $('#shareDlg').showModal();
  const r = await buildShareURL();
  $('#shareUrl').value = r.short || r.url;
  if (r.short) {
    S.shortURL = r.short;
    $('#linkLen').textContent = 'Link corto · ' + r.short.length + ' caratteri' + (r.compacted ? ' · citazioni abbreviate' : '');
  } else if (r.tooLong) {
    $('#linkLen').textContent = 'Piano troppo grande per il link corto · link completo';
    $('#linkLen').classList.add('warn');
  } else {
    $('#linkLen').textContent = 'Link corto non disponibile · uso il link completo';
  }
}

async function buildGuideFile() {
  await (S.photosPromise || Promise.resolve());
  await ensureOriginalAudio();
  const html = await (await fetch('guida7.html', { cache: 'no-store' })).text();
  const json = JSON.stringify(S.plan).replace(/</g, '\u003c');
  const inject = '<style>.top-link{display:none}</style><script>window.__GB_PLAN__=' + json + ';</script>';
  const out = html.replace('</head>', inject + '</head>');
  return new File([out], 'Guida-Opera-' + todayISO() + '.html', { type: 'text/html' });
}

async function sendGuide() {
  if (!S.plan) { toast('Prima prepara la guida dal vocale.', true); return; }
  const btn = $('#sendTop'), old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<svg><use href="#i-spark"/></svg><span>Preparo la guida…</span>';
  try {
    const f = await buildGuideFile();
    let shared = false;
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], title: 'Guida di oggi', text: 'Ecco la guida di oggi. Apri il file e spunta le checklist.' });
        shared = true;
      }
    } catch (e) { if (e && e.name === 'AbortError') shared = true; }
    if (!shared) {
      download(f.name, await f.text(), 'text/html');
      toast('Guida pronta: allegala su WhatsApp o inviala al dipendente.');
    }
  } catch (e) {
    toast('Non riesco a preparare la guida: ' + (e.message || 'errore'), true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = old;
  }
}

function copyText(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('clipboard'));
}

function openGuide() {
  if (!S.plan) { toast('Prima elabora un vocale.', true); return; }
  window.open(planURL(), '_blank');
}

function previewGuide() {
  openGuide();
}

function openEdit() {
  if (!S.transcript) { toast('Prima trascrivi o incolla un vocale.', true); return; }
  $('#editText').value = S.transcript;
  $('#editDlg').showModal();
  setTimeout(() => $('#editText').focus(), 80);
}

function applyEdit() {
  const t = $('#editText').value.trim();
  if (t.length < 30) { toast('Il testo è troppo corto.', true); return; }
  const fixed = fixText(t);
  const plan = buildPlan(fixed, { site: S.site, referente: S.referente, owner: S.owner, updated: itDate(todayISO()) });
  if (!plan) { toast('Non ho riconosciuto attività nel testo corretto.', true); return; }
  S.transcript = fixed;
  S.chunks = [{ text: fixed, start: 0, end: 0 }];
  S.plan = plan;
  S.planURL = ''; S.shortURL = ''; S.status = 'done';
  $('#editDlg').close();
  renderTranscript();
  renderPlan(plan);
  S.photosPromise = autoPhotos(S.plan).catch(() => 0);
  toast('Guida aggiornata');
}

/* ============================================================
   Editor dei compiti, della parte generale e dei regolamenti
   ============================================================ */

const GROUP_LABELS = {
  giro: 'Giro', orari: 'Orari e frequenza', vizi: 'Attenzioni del cliente',
  prodotti: 'Prodotti e materiali', chiavi: 'Chiavi e accessi',
  sicurezza: 'Sicurezza', dpi: 'DPI', attrezzature: 'Attrezzature'
};
const GENERAL_KEYS = ['giro', 'orari', 'vizi'];
let EDIT = null;
let REC = null, REC_PARTS = [], REC_TARGET = 'task';

async function uploadHost(blob, name) {
  const fd = new FormData();
  fd.append('file', new File([blob], name || 'file'));
  const r = await fetch('https://kappa.lol/api/upload', { method: 'POST', body: fd });
  if (!r.ok) throw new Error('host ' + r.status);
  const j = await r.json();
  if (!j || !j.link) throw new Error('risposta host non valida');
  return j.link;
}

async function imageForUpload(file) {
  try {
    const bmp = await createImageBitmap(file);
    const max = 1280;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.78));
    if (blob) return blob;
  } catch (e) { }
  return file;
}

function statusFor(target) { return target === 'group' ? $('#gdStatus') : $('#tdStatus'); }
function setEditStatus(target, msg, err) {
  const el = statusFor(target);
  if (el) { el.textContent = msg || ''; el.classList.toggle('err', !!err); }
}

function mediaHtml(photos, audios) {
  return (photos || []).map((p, i) =>
    `<div class="phitem"><img src="${esc(p.url)}" alt=""><input class="phcap" data-i="${i}" value="${esc(p.cap || '')}" placeholder="Dove / cosa mostra"><button type="button" class="phdel" data-i="${i}" aria-label="Rimuovi foto">✕</button></div>`).join('') +
    (audios || []).map((a, i) =>
      `<div class="auitem"><audio controls preload="none" src="${esc(a.url)}"></audio><button type="button" class="audel" data-i="${i}" aria-label="Rimuovi vocale">✕</button></div>`).join('');
}

function renderTaskMedia() {
  if (!EDIT) return;
  $('#tdPhotoList').innerHTML = mediaHtml(EDIT.photos, []);
  $('#tdAudioList').innerHTML = mediaHtml([], EDIT.audios);
}
function renderGroupMedia() {
  if (!EDIT) return;
  $('#gdPhotoList').innerHTML = mediaHtml(EDIT.photos, []);
  $('#gdAudioList').innerHTML = mediaHtml([], EDIT.audios);
}

function openTask(day, idx) {
  if (!S.plan) return;
  const isMes = day === 'mes';
  const d = isMes ? { id: 'mes', steps: S.plan.monthly } : S.plan.days.find(x => x.id === day);
  if (!d) return;
  const s = idx >= 0 && d.steps[idx] ? d.steps[idx] : { t: '', loc: '', min: 0, desc: '', acts: ['Completato'], note: '', photos: [], audios: [] };
  EDIT = { kind: 'task', day, idx, step: JSON.parse(JSON.stringify(s)), photos: mediaArr(s.photos), audios: mediaArr(s.audios) };
  $('#tdTitle').textContent = idx >= 0 ? 'Modifica compito' : 'Nuovo compito';
  $('#tdName').value = s.t || '';
  $('#tdLoc').value = s.loc || '';
  $('#tdMin').value = s.min || '';
  $('#tdDesc').value = s.desc || stripNote(s.note) || '';
  $('#tdActs').value = (s.acts || []).join('\n');
  $('#tdNote').value = s.note || '';
  $('#tdDelete').hidden = idx < 0;
  setEditStatus('task', '');
  renderTaskMedia();
  $('#taskDlg').showModal();
}

function saveTask() {
  if (!EDIT || EDIT.kind !== 'task') return;
  const name = $('#tdName').value.trim() || 'Attività';
  const acts = $('#tdActs').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12);
  const caps = $$('#tdPhotoList .phcap').map(x => x.value.trim());
  const photos = EDIT.photos.map((p, i) => ({ url: p.url, cap: caps[i] || '' }));
  const auds = EDIT.audios.map(a => ({ url: a.url, cap: a.cap || '', mime: a.mime || '' }));
  const step = Object.assign({}, EDIT.step, {
    t: name, loc: $('#tdLoc').value.trim(), min: Math.max(0, Number($('#tdMin').value) || 0),
    desc: $('#tdDesc').value.trim(), acts: acts.length ? acts : ['Completato'],
    note: $('#tdNote').value.trim(), photos, audios: auds
  });
  const isMes = EDIT.day === 'mes';
  if (isMes) {
    if (EDIT.idx >= 0) S.plan.monthly[EDIT.idx] = step; else S.plan.monthly.push(step);
  } else {
    const d = S.plan.days.find(x => x.id === EDIT.day);
    if (!d) return;
    if (EDIT.idx >= 0) d.steps[EDIT.idx] = step; else d.steps.push(step);
  }
  S.planURL = ''; S.shortURL = '';
  $('#taskDlg').close();
  renderPlan(S.plan);
  toast('Compito aggiornato');
  EDIT = null;
}

function deleteTask() {
  if (!EDIT || EDIT.kind !== 'task' || EDIT.idx < 0) return;
  if (!confirm('Eliminare questo compito?')) return;
  if (EDIT.day === 'mes') S.plan.monthly.splice(EDIT.idx, 1);
  else { const d = S.plan.days.find(x => x.id === EDIT.day); if (d) d.steps.splice(EDIT.idx, 1); }
  S.planURL = ''; S.shortURL = '';
  $('#taskDlg').close();
  renderPlan(S.plan);
  toast('Compito eliminato');
  EDIT = null;
}

function openGroup(key) {
  if (!S.plan) return;
  const isGeneral = GENERAL_KEYS.includes(key);
  const arr = isGeneral ? (S.plan.generale[key] || []) : (S.plan.rules[key] || []);
  EDIT = {
    kind: 'group', key, photos: isGeneral ? [] : mediaArr(S.plan.rulePhotos[key] || []),
    audios: isGeneral ? [] : mediaArr(S.plan.ruleAudios[key] || [])
  };
  $('#gdTitle').textContent = 'Modifica · ' + (GROUP_LABELS[key] || key);
  $('#gdText').value = key === 'orari'
    ? (arr || []).map(r => Array.isArray(r) ? r.join(' | ') : String(r)).join('\n')
    : (arr || []).join('\n');
  $('#gdMediaWrap').hidden = isGeneral;
  setEditStatus('group', '');
  renderGroupMedia();
  $('#groupDlg').showModal();
}

function saveGroup() {
  if (!EDIT || EDIT.kind !== 'group') return;
  const key = EDIT.key;
  const lines = $('#gdText').value.split('\n').map(x => x.trim()).filter(Boolean);
  if (key === 'orari') {
    const rows = lines.map(l => {
      const p = l.split('|').map(x => x.trim());
      return [p[0] || '', p[1] || '', p[2] || ''];
    }).filter(r => r[0]);
    S.plan.generale.orari = rows;
  } else if (GENERAL_KEYS.includes(key)) {
    S.plan.generale[key] = lines;
  } else {
    const caps = $$('#gdPhotoList .phcap').map(x => x.value.trim());
    S.plan.rules[key] = lines;
    S.plan.rulePhotos[key] = EDIT.photos.map((p, i) => ({ url: p.url, cap: caps[i] || '' }));
    S.plan.ruleAudios[key] = EDIT.audios.map(a => ({ url: a.url, cap: a.cap || '', mime: a.mime || '' }));
  }
  S.planURL = ''; S.shortURL = '';
  $('#groupDlg').close();
  renderPlan(S.plan);
  toast('Sezione aggiornata');
  EDIT = null;
}

async function addPhotos(files, target) {
  if (!EDIT || !files || !files.length) return;
  setEditStatus(target, 'Carico ' + files.length + (files.length === 1 ? ' foto…' : ' foto…'));
  for (const f of Array.from(files)) {
    try {
      const blob = await imageForUpload(f);
      const url = await uploadHost(blob, f.name || 'foto.jpg');
      EDIT.photos.push({ url, cap: '' });
      if (target === 'group') renderGroupMedia(); else renderTaskMedia();
    } catch (e) {
      setEditStatus(target, 'Foto non caricata: ' + (e.message || 'errore'), true);
      toast('Non riesco a caricare la foto', true);
      return;
    }
  }
  setEditStatus(target, EDIT.photos.length + (EDIT.photos.length === 1 ? ' foto allegata' : ' foto allegate'));
}

async function addAudioBlob(blob, name, target) {
  setEditStatus(target, 'Carico il vocale…');
  try {
    const url = await uploadHost(blob, name || 'vocale.webm');
    EDIT.audios.push({ url, cap: '', mime: blob.type || '' });
    if (target === 'group') renderGroupMedia(); else renderTaskMedia();
    setEditStatus(target, 'Vocale allegato · ' + EDIT.audios.length);
  } catch (e) {
    setEditStatus(target, 'Vocale non caricato: ' + (e.message || 'errore'), true);
    toast('Non riesco a caricare il vocale', true);
  }
}

async function startRecord(target) {
  if (REC) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
    REC = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    REC_PARTS = [];
    REC_TARGET = target;
    REC.ondataavailable = e => { if (e.data && e.data.size) REC_PARTS.push(e.data); };
    REC.onstop = async () => {
      const blob = new Blob(REC_PARTS, { type: REC.mimeType || 'audio/webm' });
      try { stream.getTracks().forEach(t => t.stop()); } catch (e) { }
      REC = null;
      $('#tdRecord').hidden = false; $('#gdRecord').hidden = false;
      $('#tdStop').hidden = true; $('#gdStop').hidden = true;
      await addAudioBlob(blob, 'vocale.' + (blob.type.indexOf('mp4') >= 0 ? 'm4a' : 'webm'), target);
    };
    REC.start();
    $('#tdRecord').hidden = true; $('#gdRecord').hidden = true;
    $('#tdStop').hidden = target !== 'task'; $('#gdStop').hidden = target !== 'group';
    setEditStatus(target, 'Sto registrando… premi Ferma per finire.');
  } catch (e) {
    toast('Microfono non disponibile. Controlla i permessi.', true);
  }
}

function stopRecord() { if (REC && REC.state === 'recording') REC.stop(); }

function bindEditor() {
  $('#preview').addEventListener('click', e => {
    const add = e.target.closest('.padd');
    if (add) { openTask(add.dataset.day, -1); return; }
    const edit = e.target.closest('.pedit');
    if (!edit) return;
    if (edit.dataset.day !== undefined) openTask(edit.dataset.day, Number(edit.dataset.idx));
    else if (edit.dataset.g) openGroup(edit.dataset.g);
  });
  $('#tdAI').addEventListener('click', () => {
    if (!EDIT || EDIT.kind !== 'task') return;
    const source = $('#tdNote').value.trim() || $('#tdDesc').value.trim();
    const acts = $('#tdActs').value.split('\n').map(x => x.trim()).filter(Boolean);
    $('#tdDesc').value = summarizeStep(stripNote(source) || source, acts.length ? acts : EDIT.step.acts, $('#tdLoc').value.trim());
    toast('Sintesi AI pronta');
  });
  $('#tdSave').addEventListener('click', saveTask);
  $('#tdDelete').addEventListener('click', deleteTask);
  $('#tdPhotos').addEventListener('change', e => { addPhotos(e.target.files, 'task'); e.target.value = ''; });
  $('#tdPhotoList').addEventListener('input', e => { if (e.target.classList.contains('phcap') && EDIT) { const i = +e.target.dataset.i; if (EDIT.photos[i]) EDIT.photos[i].cap = e.target.value; } });
  $('#tdAudio').addEventListener('change', e => { if (e.target.files[0]) addAudioBlob(e.target.files[0], e.target.files[0].name, 'task'); e.target.value = ''; });
  $('#tdRecord').addEventListener('click', () => startRecord('task'));
  $('#tdStop').addEventListener('click', stopRecord);
  $('#taskDlg').addEventListener('click', e => {
    const d = e.target.closest('.phdel'); const a = e.target.closest('.audel');
    if (d) { EDIT.photos.splice(Number(d.dataset.i), 1); renderTaskMedia(); }
    if (a) { EDIT.audios.splice(Number(a.dataset.i), 1); renderTaskMedia(); }
  });
  $('#gdSave').addEventListener('click', saveGroup);
  $('#gdPhotos').addEventListener('change', e => { addPhotos(e.target.files, 'group'); e.target.value = ''; });
  $('#gdPhotoList').addEventListener('input', e => { if (e.target.classList.contains('phcap') && EDIT) { const i = +e.target.dataset.i; if (EDIT.photos[i]) EDIT.photos[i].cap = e.target.value; } });
  $('#gdAudio').addEventListener('change', e => { if (e.target.files[0]) addAudioBlob(e.target.files[0], e.target.files[0].name, 'group'); e.target.value = ''; });
  $('#gdRecord').addEventListener('click', () => startRecord('group'));
  $('#gdStop').addEventListener('click', stopRecord);
  $('#groupDlg').addEventListener('click', e => {
    const d = e.target.closest('.phdel'); const a = e.target.closest('.audel');
    if (d) { EDIT.photos.splice(Number(d.dataset.i), 1); renderGroupMedia(); }
    if (a) { EDIT.audios.splice(Number(a.dataset.i), 1); renderGroupMedia(); }
  });
}

function bindResult() {
  $('#sendTop').addEventListener('click', sendGuide);
  $('#openGuide').addEventListener('click', openGuide);
  $('#guideTop').addEventListener('click', openGuide);
  $('#downloadPlan').addEventListener('click', () => {
    if (!S.plan) return;
    download('Piano-' + todayISO() + '.json', JSON.stringify(S.plan, null, 1), 'application/json');
    toast('Piano scaricato');
  });
  $('#newVoice').addEventListener('click', () => {
    if (S.plan && !confirm('Vuoi preparare una nuova guida? Il vocale attuale verrà rimosso.')) return;
    if (S.url) URL.revokeObjectURL(S.url);
    S.file = null; S.url = ''; S.name = ''; S.size = 0; S.duration = 0; S.status = 'idle';
    S.chunks = []; S.transcript = ''; S.plan = null; S.planURL = ''; S.shortURL = ''; S.photosPromise = null;
    try { localStorage.removeItem(STORE_PLAN); } catch (e) { }
    $('#upEmpty').hidden = false; $('#upFilled').hidden = true;
    $('#drop').classList.remove('has-file');
    $('#prog').hidden = true; $('#trDetails').hidden = true;
    $('#result').classList.remove('on'); $('#summary').classList.remove('on');
    $('#audio').removeAttribute('src'); $('#audio').load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#copyBtn2').addEventListener('click', async () => {
    const ta = $('#shareUrl'); ta.select();
    try { await copyText(ta.value); toast('Link copiato'); } catch (e) { document.execCommand('copy'); toast('Link copiato'); }
  });
  $('#sharePreview').addEventListener('click', () => window.open($('#shareUrl').value, '_blank'));
  $('#editTr').addEventListener('click', openEdit);
  $('#editOk').addEventListener('click', applyEdit);
  $('#shareWa').addEventListener('click', () => {
    window.open('https://wa.me/?text=' + encodeURIComponent('Ciao, ecco la guida di oggi: ' + $('#shareUrl').value), '_blank');
  });
}

/* ============================================================
   Incolla trascrizione
   ============================================================ */

function bindPaste() {
  $('#pasteBtn').addEventListener('click', () => { $('#pasteText').value = ''; $('#pasteDlg').showModal(); });
  $('#pasteOk').addEventListener('click', () => {
    const text = $('#pasteText').value.trim();
    if (text.length < 30) { toast('Incolla il testo del vocale.', true); return; }
    const plan = buildPlan(text, {
      site: S.site, referente: S.referente, owner: S.owner, updated: itDate(todayISO())
    });
    if (!plan) { toast('Non ho riconosciuto attività nel testo.', true); return; }
    const fixed = fixText(text);
    S.chunks = [{ text: fixed, start: 0, end: 0 }];
    S.transcript = fixed;
    S.status = 'done';
    S.plan = plan;
    S.planURL = ''; S.shortURL = '';
    $('#pasteDlg').close();
    $('#upEmpty').hidden = true;
    $('#upFilled').hidden = false;
    $('#drop').classList.add('has-file');
    $('#audio').style.display = 'none';
    $('#prog').hidden = true;
    $('#vbName').textContent = 'Trascrizione incollata';
    $('#vbSub').textContent = 'testo incollato';
    $('#aiBtn').style.display = 'none';
    $('#aiNote').textContent = 'Testo elaborato senza AI.';
    renderTranscript();
    renderPlan(plan);
    S.photosPromise = autoPhotos(S.plan).catch(() => 0);
    toast(plan.days.reduce((a, d) => a + d.steps.length, 0) + plan.monthly.length + ' attività estratte');
    setTimeout(() => $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  });
}

/* ============================================================
   Eventi e init
   ============================================================ */

function bindUpload() {
  const drop = $('#drop'), input = $('#voiceFile');
  const pick = () => input.click();
  $('#pickBtn').addEventListener('click', pick);
  $('#pickBtn2').addEventListener('click', pick);
  input.addEventListener('change', () => { if (input.files[0]) onVoiceFile(input.files[0]); input.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onVoiceFile(f);
  });
  $('#aiBtn').addEventListener('click', runAI);
  $('#vbRemove').addEventListener('click', () => {
    if (S.plan && !confirm('Vuoi rimuovere il vocale e la guida preparata?')) return;
    if (S.url) URL.revokeObjectURL(S.url);
    S.file = null; S.url = ''; S.name = ''; S.size = 0; S.duration = 0; S.status = 'idle';
    S.chunks = []; S.transcript = ''; S.plan = null; S.planURL = ''; S.shortURL = ''; S.photosPromise = null;
    try { localStorage.removeItem(STORE_PLAN); } catch (e) { }
    $('#upEmpty').hidden = false; $('#upFilled').hidden = true;
    $('#drop').classList.remove('has-file');
    $('#prog').hidden = true; $('#trDetails').hidden = true;
    $('#result').classList.remove('on'); $('#summary').classList.remove('on');
    $('#audio').removeAttribute('src'); $('#audio').load();
    updateVoiceUI();
  });
}

function bindMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(STORE_META) || 'null');
    if (m) { S.site = m.site || S.site; S.referente = m.referente || S.referente; S.owner = m.owner || S.owner; }
  } catch (e) { }
  $('#metaSite').value = S.site;
  $('#metaRef').value = S.referente;
  $('#metaOwner').value = S.owner;
  const sync = () => {
    S.site = $('#metaSite').value.trim();
    S.referente = $('#metaRef').value.trim();
    S.owner = $('#metaOwner').value.trim() || 'Opera Guida Personale';
    try { localStorage.setItem(STORE_META, JSON.stringify({ site: S.site, referente: S.referente, owner: S.owner })); } catch (e) { }
    if (S.plan) {
      S.plan.meta.site = S.site;
      S.plan.meta.referente = S.referente;
      S.plan.meta.owner = S.owner;
      S.planURL = ''; S.shortURL = '';
      $('#resultSub').textContent = [S.plan.meta.site, S.plan.meta.referente ? 'referente ' + S.plan.meta.referente : '', S.plan.meta.updated ? 'aggiornata il ' + S.plan.meta.updated : ''].filter(Boolean).join(' · ');
    }
  };
  ['metaSite', 'metaRef', 'metaOwner'].forEach(id => document.getElementById(id).addEventListener('input', sync));
}

function bindDialogs() {
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d) d.close();
      const c = e.target.closest('[data-close]');
      if (c) d.close();
    });
  });
}

function init() {
  buildMockBars();
  bindGate();
  bindUpload();
  bindMeta();
  bindPaste();
  bindResult();
  bindEditor();
  bindDialogs();
  resetWorkspace();
  if (sessionStorage.getItem('gb-admin') === 'ok') {
    setTimeout(() => $('#app').classList.add('ready'), 0);
  }
  window.addEventListener('pageshow', e => { if (e.persisted) resetWorkspace(); });
}

document.addEventListener('DOMContentLoaded', init);
