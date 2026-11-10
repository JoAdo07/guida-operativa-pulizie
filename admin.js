'use strict';

/* ============================================================
   Global Behring · Area responsabili
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
  [/\ble\s+polvere\b/gi, 'le polveri'],
  [/\bi\s+cestino\b/gi, 'i cestini'],
  [/\bla\s+spazzature\b/gi, 'la spazzatura']
];

const VOCAB = ('corridoio corridoi mensa mense riunione riunioni ufficio uffici bagno bagni ' +
  'spogliatoio spogliatoi magazzino magazzini laboratorio laboratori infermeria ascensore ascensori ' +
  'scala scale reception portineria ingresso atrio cortile parcheggio esterni capannone sanitari ' +
  'piastrelle pavimento pavimenti scopatura spolvero polvere polveri svuotamento cestino cestini ' +
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
  site: "Via dell'Industria 11, Castelli Calepio",
  referente: 'Laura San Pellegrino',
  owner: 'Global Behring'
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
      code.value = '';
    } else {
      err.classList.add('on');
      code.select();
      form.animate ? form.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 220 }) : null;
    }
  });
  $('#logoutBtn').addEventListener('click', () => {
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
  S.chunks = []; S.transcript = ''; S.plan = null; S.planURL = ''; S.shortURL = '';

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
    });
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
  chiavi: ['chiave', 'chiavi', 'badge', 'allarme', 'registro', 'firma', 'firme', 'timbratura', 'timbrare', 'dpi', 'guanti', 'mascherina', 'occhiali', 'scarpe', 'antiscivolo', 'documenti', 'procedura', 'procedure', 'primo accesso', 'cancello', 'portone', 'codice', 'disarmare', 'armare', 'tesserino', 'formazione', 'rischio', 'rischi'],
  attrezzature: ['attrezzatura', 'attrezzature', 'lavasciuga', 'lavamoquette', 'carrello', 'carrelli', 'mocio', 'aspirapolvere', 'scopa', 'scopino', 'secchio', 'secchi', 'ripostiglio', 'deposito', 'armadio', 'macchinario', 'monospazzola', 'idropulitrice']
};

const ACTS = [
  ['Svuota cestini', /cestin/],
  ['Polveri', /polver|spolver/],
  ['Scopatura', /scopat|spazzare|spazzat[oa]/],
  ['Lavaggio pavimento', /lavagg\w*[^.]{0,12}paviment|lavare il pavimento|pavimento/],
  ['Lavaggio sanitari', /sanitar/],
  ['Lavaggio piastrelle', /piastrell/],
  ['Impronte vetri', /impront/],
  ['Deragnatura', /ragnatel|deragn/],
  ['Pulizia tavoli', /tavol/],
  ['Pulizia sedie', /sedi[ea]/],
  ['Pulizia microonde', /microonde/],
  ['Pulizia macchinetta', /macchinetta|macchina del caff/],
  ['Pulizia armadietti', /armadiett/],
  ['Pulizia corrimano', /corrimano/],
  ['Pulizia ascensore', /ascensor/],
  ['Pulizia porte', /port[ae]/],
  ['Raccolta rifiuti', /spazzatur|rifiut|immondiz|differenziat/],
  ['Rifornimento', /riforn|dispenser|carta igienica|sapone/],
  ['Controllo', /controll/]
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
  const named = text.match(/ufficio (?:di|del|della|dello|dei|degli)\s*([a-zà-ù]+)/i);
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
    if (/pulir|pulizia/.test(n)) out.push('Pulizia');
    else if (/lavagg/.test(n)) out.push('Lavaggio');
    else if (/controll/.test(n)) out.push('Controllo');
    else out.push('Completato');
  }
  return out.slice(0, 7);
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

function buildPlan(text, meta) {
  const parts = splitText(fixText(text));
  if (!parts.length) return null;

  const days = {
    lun: { id: 'lun', label: 'Lunedì', short: 'Lun', sub: 'piano di lavoro', start: '06:00', end: '11:30', steps: [] },
    mar: { id: 'mar', label: 'Martedì e giovedì', short: 'Mar–Gio', sub: 'piano di lavoro', start: '06:00', end: '10:30', steps: [] },
    mer: { id: 'mer', label: 'Mercoledì', short: 'Mer', sub: 'piano di lavoro', start: '06:00', end: '12:30', steps: [] }
  };
  const monthly = [];
  const rules = { prodotti: [], chiavi: [], attrezzature: [] };
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

    if (!isTaskLike(textS)) continue;

    const catLabel = taskCat(textS);
    const place = placeOf(textS);
    const floor = floorOf(textS);
    let title = place ? place.title : '';
    let img = place ? place.img : 'ufficio';
    if (catLabel === 'vizi') {
      if (/macchinetta|macchina del caff|pausa caff/.test(norm(textS))) { title = 'Pulizia macchinetta'; img = 'caffe'; }
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
    const step = {
      t: title,
      loc: floor || (catLabel === 'orari' ? 'orario' : catLabel === 'vizi' ? 'attenzione' : 'giro'),
      min: minutesOf(textS),
      img,
      acts: actsOf(textS),
      note: (catLabel === 'orari' ? 'Orari e frequenza' : catLabel === 'vizi' ? 'Vizi e spazzatura' : 'Giro') + ' · «' + textS + '»'
    };

    const target = current === 'mes' ? monthly : days[current].steps;
    if (!target.some(x => norm(x.t) === norm(step.t) && norm(x.note) === norm(step.note))) target.push(step);
  }

  const dayList = ['lun', 'mar', 'mer'].map(id => days[id]).filter(d => d.steps.length);
  if (!dayList.length && !monthly.length) return null;

  const orari = dayList.map(d => [d.label, d.start + ' – ' + d.end, hours(d.start, d.end)]);
  if (monthly.length) orari.push(['Mensile', 'una volta al mese', '—']);

  return {
    v: 1,
    meta: meta || {},
    days: dayList,
    monthly: monthly,
    rules: {
      orari,
      prodotti: rules.prodotti.slice(0, 12),
      chiavi: rules.chiavi.slice(0, 12),
      attrezzature: rules.attrezzature.slice(0, 12),
      si: [],
      no: [],
      rischi: []
    }
  };
}

function hours(a, b) {
  const toM = t => { const p = String(t || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); };
  const m = Math.max(0, toM(b) - toM(a));
  return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + pad(m % 60) : '');
}

/* ============================================================
   Risultato e condivisione
   ============================================================ */

function renderPlan(plan) {
  const tasks = plan.days.reduce((a, d) => a + d.steps.length, 0) + plan.monthly.length;
  const rules = plan.rules.prodotti.length + plan.rules.chiavi.length + plan.rules.attrezzature.length;
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
  plan.days.forEach(d => {
    html += `<div class="pgroup"><div class="pgroup-head"><h3>${esc(d.label)}</h3><span>${d.steps.length} attività · ${esc(d.start)}–${esc(d.end)}</span></div>`;
    html += d.steps.map(s => taskPreview(s)).join('');
    html += '</div>';
  });
  if (plan.monthly.length) {
    html += `<div class="pgroup"><div class="pgroup-head"><h3>Servizio mensile</h3><span>${plan.monthly.length} attività</span></div>` + plan.monthly.map(s => taskPreview(s)).join('') + '</div>';
  }
  html += `<div class="pgroup"><div class="pgroup-head"><h3>Regolamenti</h3><span>Prodotti · chiavi · attrezzature</span></div><div class="rules-preview">
    ${rulePreview('Prodotti e materiali', plan.rules.prodotti)}
    ${rulePreview('Chiavi e accessi', plan.rules.chiavi)}
    ${rulePreview('Attrezzature', plan.rules.attrezzature)}
  </div></div>`;
  $('#preview').innerHTML = html;
}

function taskPreview(s) {
  return `<div class="ptask"><div class="pt-top"><b>${esc(s.t)}</b>${s.min ? `<span class="pt-min">~${s.min} min</span>` : ''}</div>` +
    `<p>${esc((s.note || '').replace(/^[^·]+· «/, '«'))}</p>` +
    `<div class="pt-chips">${(s.acts || []).map(a => `<span>${esc(a)}</span>`).join('')}</div></div>`;
}

function rulePreview(title, arr) {
  return `<div class="rprev"><h4>${esc(title)}</h4>${arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="empty-r">Nessuna indicazione nel vocale.</div>'}</div>`;
}

const SHORT_CACHE = new Map();

function encodePlan(plan) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(plan));
}

function urlForPlan(plan) {
  return new URL('./?v=3', location.href).href + '#d=' + encodePlan(plan);
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
  for (const k of ['prodotti', 'chiavi', 'attrezzature']) if (p.rules && Array.isArray(p.rules[k])) p.rules[k] = p.rules[k].slice(0, 8);
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

async function openShare() {
  if (!S.plan) { toast('Prima elabora un vocale.', true); return; }
  let url = planURL();
  let compacted = false;
  if (url.length > 4990) {
    for (const lim of [120, 90, 60, 0]) {
      const c = urlForPlan(compactPlan(S.plan, lim));
      if (c.length <= 4990) { url = c; compacted = true; break; }
    }
  }
  S.shortURL = '';
  $('#shareUrl').value = url;
  const tooLong = url.length > 4990;
  $('#linkLen').textContent = tooLong ? 'Link completo · troppo grande per il link corto' : (compacted ? 'Preparo il link corto (citazioni abbreviate)…' : 'Preparo il link corto…');
  $('#linkLen').classList.toggle('warn', tooLong);
  $('#shareDlg').showModal();
  if (tooLong) return;
  const short = await shortenLink(url);
  if (short) {
    S.shortURL = short;
    $('#shareUrl').value = short;
    $('#linkLen').textContent = 'Link corto · ' + short.length + ' caratteri' + (compacted ? ' · citazioni abbreviate' : '');
    $('#linkLen').classList.remove('warn');
  } else {
    $('#linkLen').textContent = 'Link corto non disponibile · uso il link completo';
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

function bindResult() {
  $('#shareBtn').addEventListener('click', openShare);
  $('#copyLink').addEventListener('click', () => {
    if (!S.plan) { toast('Prima elabora un vocale.', true); return; }
    openShare();
  });
  $('#previewBtn').addEventListener('click', previewGuide);
  $('#openGuide').addEventListener('click', openGuide);
  $('#waLink').addEventListener('click', () => {
    if (!S.plan) { toast('Prima elabora un vocale.', true); return; }
    openShare();
  });
  $('#downloadPlan').addEventListener('click', () => {
    if (!S.plan) return;
    download('Piano-' + todayISO() + '.json', JSON.stringify(S.plan, null, 1), 'application/json');
    toast('Piano scaricato');
  });
  $('#newVoice').addEventListener('click', () => {
    if (S.plan && !confirm('Vuoi preparare una nuova guida? Il vocale attuale verrà rimosso.')) return;
    if (S.url) URL.revokeObjectURL(S.url);
    S.file = null; S.url = ''; S.name = ''; S.size = 0; S.duration = 0; S.status = 'idle';
    S.chunks = []; S.transcript = ''; S.plan = null; S.planURL = ''; S.shortURL = '';
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
    S.chunks = []; S.transcript = ''; S.plan = null; S.planURL = ''; S.shortURL = '';
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
    S.owner = $('#metaOwner').value.trim() || 'Global Behring';
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
  bindDialogs();
  updateVoiceUI();
  try {
    const raw = localStorage.getItem(STORE_PLAN);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.days) && p.days.length) {
        S.plan = p;
        S.planURL = ''; S.shortURL = '';
        renderPlan(p);
      }
    }
  } catch (e) { }
  if (sessionStorage.getItem('gb-admin') === 'ok') {
    setTimeout(() => $('#app').classList.add('ready'), 0);
  }
}

document.addEventListener('DOMContentLoaded', init);
