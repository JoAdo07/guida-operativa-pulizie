'use strict';

/* ============================================================
   Global Behring · Modulo comunicazione
   Vocale → compiti → modulo del dipendente
   Tutto lato browser: nessun server, nessun upload.
   ============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmt = s => { s = Math.max(0, Math.round(Number(s) || 0)); return Math.floor(s / 60) + ':' + pad(s % 60); };
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const itDate = iso => { if (!iso) return ''; const p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; };
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

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
   Contenuto del modulo
   ============================================================ */

const SECTIONS = [
  {
    id: 'giro', title: 'Giro', short: 'Giro', sub: 'Il posto, le aree, gli accessi.',
    questions: [
      { id: 'g1', label: 'Che servizio è?', chips: ['Civile', 'Industriale', 'Reception'] },
      { id: 'g2', label: 'Lavori in azienda aperta con gente dentro o a locali vuoti?', chips: ['Aperta con persone', 'Locali vuoti', 'Misto'] },
      { id: 'g3', label: 'Quali aree tocchi?', chips: ['Uffici', 'Produzione', 'Magazzino', 'Spogliatoi', 'Bagni', 'Esterni'], multi: true, hint: 'Seleziona le aree e aggiungi quelle che mancano.' },
      { id: 'g4', label: 'Quanti piani sono? Ci sono scale, ascensore o montacarichi?', ph: 'Es. 2 piani, scale e ascensore. Montacarichi solo in produzione.' },
      { id: 'g5', label: 'Ci sono zone con badge, formazione o accesso riservato?', ph: 'Es. lab, celle frigo, produzione.' }
    ]
  },
  {
    id: 'orari', title: 'Orari e frequenza', short: 'Orari', sub: 'Quando e ogni quanto.',
    questions: [
      { id: 'o1', label: 'Che fascia oraria fai? Ci sono pause?', ph: 'Es. 6:00–11:30, pausa di 15 minuti alle 8:30.' },
      { id: 'o2', label: 'Cosa fai tutti i giorni?' },
      { id: 'o3', label: 'Cosa fai solo 1 volta a settimana?' },
      { id: 'o4', label: 'Al mese, trimestre o anno cosa è previsto?' },
      { id: 'o5', label: 'Ci sono straordinari già in canone o a chiamata? E usi lavasciuga o altro?', chips: ['In canone', 'A chiamata', 'Nessuno'] }
    ]
  },
  {
    id: 'prodotti', title: 'Prodotti e materiale', short: 'Prodotti', sub: 'Cosa serve e chi lo fornisce.',
    questions: [
      { id: 'p1', label: 'Servono prodotti particolari tipo Ecolabel?', chips: ['Sì, Ecolabel', 'Prodotti standard', 'Non so'] },
      { id: 'p2', label: 'Dobbiamo fornire a te carta e sapone?', chips: ['Sì, tutto', 'Solo carta', 'Solo sapone', 'Fornisce il cliente'] },
      { id: 'p3', label: 'C\'è un posto dove lasciare le attrezzature?', ph: 'Es. ripostiglio al piano terra, armadio nel corridoio.' }
    ]
  },
  {
    id: 'vizi', title: 'Vizi e spazzatura', short: 'Vizi', sub: 'Le attenzioni del cliente.',
    questions: [
      { id: 'v1', label: 'C\'è qualcosa a cui il cliente tiene in modo particolare?', ph: 'Es. macchinetta del caffè sempre pulita.' },
      { id: 'v2', label: 'Quando e come va conferita la spazzatura?', ph: 'Es. ogni sera nei bidoni del cortile, differenziata.' }
    ]
  },
  {
    id: 'chiavi', title: 'Chiavi e accessi', short: 'Chiavi', sub: 'Sicurezza, DPI, procedure.',
    questions: [
      { id: 'c1', label: 'Come gestisci chiavi, badge e allarme?', ph: 'Es. chiavi in portineria, badge personale, allarme da disarmare all\'ingresso.' },
      { id: 'c2', label: 'C\'è un registro firme o timbratura?', chips: ['Registro firme', 'Timbratura', 'Nessuno dei due'] },
      { id: 'c3', label: 'Servono DPI particolari? Ci sono rischi specifici?', chips: ['Guanti', 'Calzature antiscivolo', 'Mascherina', 'Occhiali', 'Cuffie'], multi: true },
      { id: 'c4', label: 'Per il primo accesso servono documenti o procedure particolari?' }
    ]
  },
  {
    id: 'attrezzature', title: 'Attrezzature', short: 'Attrezzature', sub: 'Cosa usi e dove si trova.',
    questions: [
      { id: 'a1', label: 'Che attrezzature usi e dove le troviamo sul posto?', ph: 'Es. lavasciuga, carrello, mocio — ripostiglio al piano terra.' }
    ]
  }
];

const QLIST = [];
SECTIONS.forEach((s, si) => s.questions.forEach(q => { QLIST.push(Object.assign({}, q, { section: s.id, sectionTitle: s.title, n: QLIST.length + 1, si })); }));
const QMAP = Object.fromEntries(QLIST.map(q => [q.id, q]));
const SECMAP = Object.fromEntries(SECTIONS.map(s => [s.id, s]));

/* ============================================================
   Stato
   ============================================================ */

const STORE = 'gb_modulo_v1';
const STORE_ARCH = 'gb_moduli_v1';

const S = {
  mode: 'owner',
  profile: { name: '', site: '', date: todayISO() },
  answers: {},
  tasks: [],
  expanded: {},
  editing: null,
  voice: { name: '', size: 0, url: '', duration: 0, transcript: '', chunks: [], status: 'idle', manual: false },
  planDate: '',
  planOwner: 'Global Behring',
  planFp: '',
  savedAt: 0
};

let saveTimer = null;
let storageWarned = false;

function ensureAnswer(qid) {
  if (!S.answers[qid]) S.answers[qid] = { text: '', choices: [], photos: [], clips: [] };
  const a = S.answers[qid];
  if (!Array.isArray(a.photos)) a.photos = [];
  if (!Array.isArray(a.clips)) a.clips = [];
  if (!Array.isArray(a.choices)) a.choices = [];
  return a;
}

function persistWith(data, retry) {
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
    return true;
  } catch (e) {
    if (retry) {
      const slim = JSON.parse(JSON.stringify(data));
      Object.values(slim.answers || {}).forEach(a => {
        a.photos = [];
        (a.clips || []).forEach(c => { c.data = ''; });
      });
      (slim.tasks || []).forEach(t => { t.photos = []; });
      const ok = persistWith(slim, false);
      if (ok && !storageWarned) {
        storageWarned = true;
        toast('Spazio del browser pieno: le foto non restano nella bozza. Scarica il report per conservarle.', true);
      }
      return ok;
    }
    return false;
  }
}

function saveNow() {
  S.savedAt = Date.now();
  const data = {
    v: 1, savedAt: S.savedAt, mode: S.mode, profile: S.profile, answers: S.answers,
    tasks: S.tasks, planDate: S.planDate, planOwner: S.planOwner, planFp: S.planFp
  };
  const ok = persistWith(data, true);
  const dot = $('#savedDot');
  if (dot) {
    dot.classList.remove('busy');
    dot.querySelector('span').textContent = ok ? 'Bozza salvata sul dispositivo' : 'Bozza non salvata: spazio esaurito';
  }
  return ok;
}

function queueSave() {
  const dot = $('#savedDot');
  if (dot) { dot.classList.add('busy'); dot.querySelector('span').textContent = 'Salvataggio…'; }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 600);
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return;
    S.mode = d.mode === 'employee' ? 'employee' : 'owner';
    S.profile = Object.assign(S.profile, d.profile || {});
    S.answers = d.answers || {};
    S.tasks = Array.isArray(d.tasks) ? d.tasks.map(t => Object.assign({ photos: [] }, t)) : [];
    S.planDate = d.planDate || '';
    S.planOwner = d.planOwner || 'Global Behring';
    S.planFp = d.planFp || '';
    S.savedAt = d.savedAt || 0;
  } catch (e) { /* bozza illeggibile: si riparte puliti */ }
}

/* ============================================================
   Rendering del modulo
   ============================================================ */

function renderSections() {
  $('#secnav').innerHTML = SECTIONS.map((s, i) =>
    `<a href="#sec-${s.id}" data-sec="${s.id}"><span class="n">${i + 1}</span>${esc(s.short)}</a>`
  ).join('') + '<span class="sp"></span><span class="cnt" id="navCnt">0/20</span>';

  $('#sections').innerHTML = SECTIONS.map((s, si) => `
    <section class="sec" id="sec-${s.id}" data-sec="${s.id}">
      <div class="sec-head">
        <span class="sec-num">${si + 1}</span>
        <div class="sec-title"><h3>${esc(s.title)}</h3><p>${esc(s.sub)}</p></div>
        <span class="sec-count" data-count="${s.id}"></span>
      </div>
      <div class="tasks" data-tasks="${s.id}"></div>
      ${s.questions.map(q => renderQuestion(q)).join('')}
    </section>
  `).join('');
}

function renderQuestion(q) {
  const qn = (QMAP[q.id] && QMAP[q.id].n) || q.n || 0;
  const chips = q.chips ? `<div class="chips" role="group" aria-label="${esc(q.label)}">${q.chips.map(c =>
    `<label class="chip" data-q="${q.id}" data-v="${esc(c)}"><input type="${q.multi ? 'checkbox' : 'radio'}" name="${q.id}" value="${esc(c)}"><svg class="ck"><use href="#i-check"/></svg>${esc(c)}</label>`
  ).join('')}</div>` : '';
  return `
    <div class="q" data-q="${q.id}" id="q-${q.id}">
      <div class="q-top"><span class="q-n">${pad(qn)}</span><label class="q-label" for="a-${q.id}">${esc(q.label)}</label></div>
      ${q.hint ? `<div class="q-hint">${esc(q.hint)}</div>` : ''}
      ${chips}
      <div class="answer"><textarea class="ta" id="a-${q.id}" data-q="${q.id}" rows="1" placeholder="${esc(q.ph || 'Scrivi la risposta…')}"></textarea></div>
      <div class="q-tools">
        <button class="tool" type="button" data-act="mic" data-q="${q.id}"><svg><use href="#i-mic"/></svg> Vocale</button>
        <button class="tool" type="button" data-act="audio" data-q="${q.id}"><svg><use href="#i-upload"/></svg> Audio</button>
        <button class="tool" type="button" data-act="photo" data-q="${q.id}"><svg><use href="#i-cam"/></svg> Foto</button>
      </div>
      <div class="att" data-att="${q.id}"></div>
    </div>`;
}

function fillForm() {
  $('#fName').value = S.profile.name || '';
  $('#fSite').value = S.profile.site || '';
  $('#fDate').value = S.profile.date || todayISO();
  QLIST.forEach(q => {
    const a = ensureAnswer(q.id);
    const ta = document.getElementById('a-' + q.id);
    if (ta && ta.value !== a.text) ta.value = a.text || '';
    $$(`.chip[data-q="${q.id}"]`).forEach(ch => {
      const on = a.choices.includes(ch.dataset.v);
      ch.classList.toggle('on', on);
      const inp = ch.querySelector('input');
      if (inp) inp.checked = on;
    });
    autoGrow(ta);
    renderAtt(q.id);
  });
  updateCounts();
}

function autoGrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(Math.max(el.scrollHeight, 46), 260) + 'px';
}

/* ---------- tasks ---------- */

function taskHTML(t) {
  const canEdit = S.mode !== 'employee';
  const sec = SECMAP[t.section] || SECTIONS[0];
  const photos = (t.photos || []).map((p, i) =>
    `<span class="thumb"><img src="${p}" alt="Prova ${i + 1}"><button class="x" type="button" data-del-tphoto="${t.id}" data-i="${i}" aria-label="Rimuovi foto"><svg><use href="#i-x"/></svg></button></span>`
  ).join('');
  const play = (t.start != null && S.voice.url) ?
    `<button class="t-play" type="button" data-play="${t.id}" title="Ascolta questo passaggio"><svg><use href="#i-play"/></svg>${fmt(t.start)}</button>` : '';
  const editing = S.editing === t.id;
  return `
    <div class="task" data-id="${t.id}">
      <div class="task-top">
        <span class="tag"><svg><use href="#i-spark"/></svg>Dal vocale</span>
        ${play}
        <span style="flex:1"></span>
        <button class="t-photo" type="button" data-tphoto="${t.id}"><svg><use href="#i-cam"/></svg>Foto</button>
        ${canEdit ? `<button class="t-photo" type="button" data-edit="${t.id}" title="Correggi il testo"><svg><use href="#i-edit"/></svg></button>` : ''}
        ${canEdit ? `<select class="t-sec" data-move="${t.id}" title="Cambia argomento">${SECTIONS.map(s => `<option value="${s.id}"${s.id === t.section ? ' selected' : ''}>${esc(s.short)}</option>`).join('')}</select>
        <button class="t-del" type="button" data-del="${t.id}" aria-label="Elimina compito"><svg><use href="#i-trash"/></svg></button>` : ''}
      </div>
      ${editing ? `<div class="task-edit"><textarea class="ta" id="edit-${t.id}">${esc(t.quote || t.text || '')}</textarea><div class="edit-actions"><button class="btn sm" type="button" data-save-edit="${t.id}">Salva</button><button class="btn ghost sm" type="button" data-cancel-edit="${t.id}">Annulla</button></div></div>` : `<p class="quote">${esc(t.quote || t.text || '')}</p>`}
      <div class="thumbs">${photos}</div>
    </div>`;
}

function renderTasks() {
  SECTIONS.forEach(sec => {
    const box = document.querySelector(`[data-tasks="${sec.id}"]`);
    if (!box) return;
    const list = S.tasks.filter(t => t.section === sec.id);
    const open = !!S.expanded[sec.id];
    const shown = open ? list : list.slice(0, 4);
    let html = shown.map(taskHTML).join('');
    if (list.length > 4) {
      html += `<button class="linkbtn" type="button" data-expand="${sec.id}">${open ? 'Mostra meno' : 'Mostra altri ' + (list.length - 4) + ' compiti'}</button>`;
    }
    if (S.mode !== 'employee') {
      html += `<button class="linkbtn" type="button" data-add="${sec.id}">＋ Aggiungi compito</button>`;
    }
    box.innerHTML = html;
    const cnt = document.querySelector(`[data-count="${sec.id}"]`);
    if (cnt) {
      const total = sec.questions.length;
      const done = sec.questions.filter(q => isAnswered(q.id)).length;
      cnt.textContent = `${done}/${total}`;
      cnt.classList.toggle('done', done === total);
    }
  });
  const nav = $('#navCnt');
  if (nav) { const d = QLIST.filter(q => isAnswered(q.id)).length; nav.textContent = `${d}/${QLIST.length}`; }
  const nv = $('#noVoice');
  if (nv) nv.style.display = (S.mode === 'employee' || S.tasks.length || S.voice.url) ? 'none' : 'flex';
}

function taskById(id) { return S.tasks.find(t => t.id === id); }

/* ---------- conteggi ---------- */

function isAnswered(qid) {
  const a = S.answers[qid];
  if (!a) return false;
  return !!((a.text || '').trim() || (a.choices || []).length || (a.photos || []).length || (a.clips || []).length);
}

function updateCounts() {
  const done = QLIST.filter(q => isAnswered(q.id)).length;
  const pct = Math.round(done / QLIST.length * 100);
  const bar = $('#miniBar'); if (bar) bar.style.width = pct + '%';
  const c = $('#miniCount'); if (c) c.textContent = `${done}/${QLIST.length}`;
  const nav = $('#navCnt'); if (nav) nav.textContent = `${done}/${QLIST.length}`;
  SECTIONS.forEach(sec => {
    const el = document.querySelector(`[data-count="${sec.id}"]`);
    if (!el) return;
    const d = sec.questions.filter(q => isAnswered(q.id)).length;
    el.textContent = `${d}/${sec.questions.length}`;
    el.classList.toggle('done', d === sec.questions.length);
  });
}

function showSummary() {
  const n = S.tasks.length;
  const on = n > 0 && S.mode !== 'employee';
  $('#summary').classList.toggle('on', on);
  if (!on) return;
  $('#sumTitle').textContent = n === 1 ? '1 compito pronto' : `${n} compiti pronti`;
  const secs = new Set(S.tasks.map(t => t.section)).size;
  $('#sumSub').textContent = `${secs === 1 ? '1 argomento' : secs + ' argomenti'} · ${itDate(S.planDate || todayISO())} · ${S.planOwner}`;
}

/* ============================================================
   Risposte: testo, scelte, foto, vocali
   ============================================================ */

function bindForm() {
  const wrap = $('#sections');

  wrap.addEventListener('input', e => {
    const ta = e.target.closest('textarea[data-q]');
    if (!ta) return;
    const a = ensureAnswer(ta.dataset.q);
    a.text = ta.value;
    autoGrow(ta);
    updateCounts(); queueSave();
  });

  wrap.addEventListener('change', e => {
    const inp = e.target.closest('.chip input');
    if (!inp) return;
    const qid = inp.name;
    const a = ensureAnswer(qid);
    if (inp.type === 'radio') {
      a.choices = [inp.value];
      $$(`.chip[data-q="${qid}"]`).forEach(ch => {
        const on = ch.dataset.v === inp.value;
        ch.classList.toggle('on', on);
        const i2 = ch.querySelector('input'); if (i2) i2.checked = on;
      });
    } else {
      const ck = $$(`.chip[data-q="${qid}"] input:checked`).map(x => x.value);
      a.choices = ck;
      $$(`.chip[data-q="${qid}"]`).forEach(ch => ch.classList.toggle('on', ck.includes(ch.dataset.v)));
    }
    updateCounts(); queueSave();
  });

  wrap.addEventListener('click', async e => {
    const tool = e.target.closest('[data-act]');
    if (tool) {
      const qid = tool.dataset.q;
      if (tool.dataset.act === 'photo') await pickQuestionPhotos(qid);
      if (tool.dataset.act === 'mic') await startRec(qid);
      if (tool.dataset.act === 'audio') await pickQuestionAudio(qid);
      return;
    }
    const delPh = e.target.closest('[data-delphoto]');
    if (delPh) {
      const a = ensureAnswer(delPh.dataset.delphoto);
      a.photos.splice(Number(delPh.dataset.i), 1);
      renderAtt(delPh.dataset.delphoto); updateCounts(); queueSave(); return;
    }
    const playClip = e.target.closest('[data-playclip]');
    if (playClip) {
      const clip = findClip(playClip.dataset.playclip);
      if (clip && clip.data) playData(clip.data);
      return;
    }
    const trClip = e.target.closest('[data-trclip]');
    if (trClip) {
      const clip = findClip(trClip.dataset.trclip);
      if (!clip) return;
      if (clip.tr) { trClip.closest('.clip').classList.toggle('open'); return; }
      await transcribeClip(clip, trClip);
      return;
    }
    const delClip = e.target.closest('[data-delclip]');
    if (delClip) {
      for (const qid of Object.keys(S.answers)) {
        const a = S.answers[qid];
        const i = (a.clips || []).findIndex(c => c.id === delClip.dataset.delclip);
        if (i >= 0) { a.clips.splice(i, 1); renderAtt(qid); updateCounts(); queueSave(); break; }
      }
      return;
    }
    const tPhoto = e.target.closest('[data-tphoto]');
    if (tPhoto) { await addTaskPhotos(tPhoto.dataset.tphoto); return; }
    const delT = e.target.closest('[data-del-tphoto]');
    if (delT) {
      const t = taskById(delT.dataset.delTphoto);
      if (t) { t.photos.splice(Number(delT.dataset.i), 1); renderTasks(); queueSave(); }
      return;
    }
    const edit = e.target.closest('[data-edit]');
    if (edit) { S.editing = edit.dataset.edit; renderTasks(); setTimeout(() => { const el = document.getElementById('edit-' + edit.dataset.edit); if (el) el.focus(); }, 30); return; }
    const saveEdit = e.target.closest('[data-save-edit]');
    if (saveEdit) {
      const t = taskById(saveEdit.dataset.saveEdit);
      const el = document.getElementById('edit-' + saveEdit.dataset.saveEdit);
      if (t && el && el.value.trim()) { t.quote = el.value.trim(); t.text = t.quote; }
      S.editing = null; renderTasks(); queueSave(); return;
    }
    const cancelEdit = e.target.closest('[data-cancel-edit]');
    if (cancelEdit) { S.editing = null; renderTasks(); return; }
    const play = e.target.closest('[data-play]');
    if (play) { const t = taskById(play.dataset.play); if (t) playSegment(t.start, t.end); return; }
    const del = e.target.closest('[data-del]');
    if (del) {
      S.tasks = S.tasks.filter(t => t.id !== del.dataset.del);
      renderTasks(); showSummary(); queueSave(); return;
    }
    const add = e.target.closest('[data-add]');
    if (add) { openTaskDialog(add.dataset.add); return; }
    const exp = e.target.closest('[data-expand]');
    if (exp) { S.expanded[exp.dataset.expand] = !S.expanded[exp.dataset.expand]; renderTasks(); return; }
  });

  wrap.addEventListener('change', e => {
    const mv = e.target.closest('select[data-move]');
    if (!mv) return;
    const t = taskById(mv.dataset.move);
    if (!t) return;
    t.section = mv.value;
    renderTasks(); showSummary(); queueSave();
    const sec = SECMAP[t.section];
    if (sec) toast('Compito spostato in ' + sec.title);
  });
}

function renderAtt(qid) {
  const box = document.querySelector(`[data-att="${qid}"]`);
  if (!box) return;
  const a = ensureAnswer(qid);
  box.innerHTML =
    a.photos.map((p, i) => `<span class="thumb"><img src="${p}" alt="Foto ${i + 1}"><button class="x" type="button" data-delphoto="${qid}" data-i="${i}" aria-label="Rimuovi foto"><svg><use href="#i-x"/></svg></button></span>`).join('') +
    a.clips.map(c => `<div class="clip" data-clip="${c.id}">
        <button class="p" type="button" data-playclip="${c.id}" aria-label="Ascolta"><svg><use href="#i-play"/></svg></button>
        <span class="nm">${fmt(c.dur)}</span>
        <span class="dur">${esc(c.name || 'nota vocale')}</span>
        <button class="tx" type="button" data-trclip="${c.id}">${c.tr ? 'Testo' : 'Trascrivi'}</button>
        <button class="del" type="button" data-delclip="${c.id}" aria-label="Elimina"><svg><use href="#i-x"/></svg></button>
        <div class="tr">${esc(c.tr || '')}</div>
      </div>`).join('');
}

function findClip(id) {
  for (const a of Object.values(S.answers)) {
    const c = (a.clips || []).find(x => x.id === id);
    if (c) return c;
  }
  return null;
}

let currentAudio = null;
function playData(src) {
  try {
    if (currentAudio) { currentAudio.pause(); }
    currentAudio = new Audio(src);
    currentAudio.play().catch(() => toast('Impossibile riprodurre l\'audio.', true));
  } catch (e) { toast('Impossibile riprodurre l\'audio.', true); }
}

/* ---------- foto ---------- */

function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file).catch(() => bitmapFallback(file));
  }
  return bitmapFallback(file);
}

function bitmapFallback(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
    img.src = url;
  });
}

async function compressImage(file, max = 1500, q = 0.78) {
  const bmp = await loadBitmap(file);
  const w = bmp.width || bmp.naturalWidth;
  const h = bmp.height || bmp.naturalHeight;
  if (!w || !h) throw new Error('image');
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  return c.toDataURL('image/jpeg', q);
}

function filePicker(accept, multiple) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    if (multiple) inp.multiple = true;
    inp.style.display = 'none';
    document.body.appendChild(inp);
    let done = false;
    inp.addEventListener('change', () => { done = true; resolve(Array.from(inp.files || [])); setTimeout(() => inp.remove(), 500); });
    window.addEventListener('focus', () => {
      setTimeout(() => { if (!done) { resolve([]); inp.remove(); } }, 800);
    }, { once: true });
    inp.click();
  });
}

async function pickQuestionPhotos(qid) {
  const files = await filePicker('image/*', true);
  if (!files.length) return;
  const a = ensureAnswer(qid);
  let added = 0;
  for (const f of files.slice(0, 8)) {
    if (!/^image\//.test(f.type)) { toast('Formato non supportato: scegli una foto.', true); continue; }
    try { a.photos.push(await compressImage(f)); added++; }
    catch (e) { toast('Non riesco a leggere questa foto (prova in JPG).', true); }
  }
  if (added) { renderAtt(qid); updateCounts(); queueSave(); toast(added === 1 ? 'Foto allegata' : added + ' foto allegate'); }
}

async function addTaskPhotos(tid) {
  const t = taskById(tid);
  if (!t) return;
  const files = await filePicker('image/*', true);
  if (!files.length) return;
  t.photos = t.photos || [];
  let added = 0;
  for (const f of files.slice(0, 6)) {
    if (!/^image\//.test(f.type)) continue;
    try { t.photos.push(await compressImage(f, 1400, 0.76)); added++; } catch (e) { }
  }
  if (added) { renderTasks(); queueSave(); toast(added === 1 ? 'Foto allegata al compito' : added + ' foto allegate'); }
}

/* ---------- vocali nelle risposte ---------- */

let rec = null;
async function startRec(qid) {
  if (rec) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    toast('Registrazione non supportata su questo browser: usa “Audio” per caricare un file.', true);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    const started = Date.now();
    const state = { mr, stream, qid, chunks, started, timer: null, stop: null };
    rec = state;
    mr.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    mr.onstop = async () => {
      clearInterval(state.timer);
      stream.getTracks().forEach(t => t.stop());
      $('#recbar').classList.remove('on');
      const dur = Math.max(1, (Date.now() - started) / 1000);
      const blob = new Blob(chunks, { type: mime || 'audio/webm' });
      rec = null;
      if (state.cancelled) return;
      if (!blob.size) { toast('Registrazione vuota.', true); return; }
      const data = await blobToDataURL(blob);
      const a = ensureAnswer(qid);
      a.clips.push({ id: uid(), name: 'nota vocale', dur, data, tr: '' });
      renderAtt(qid); updateCounts(); queueSave();
      toast('Nota vocale allegata');
    };
    mr.start();
    $('#recbar').classList.add('on');
    $('#recTime').textContent = '0:00';
    state.timer = setInterval(() => {
      const s = (Date.now() - started) / 1000;
      $('#recTime').textContent = fmt(s);
      if (s >= 120) stopRec(false);
    }, 250);
  } catch (e) {
    toast('Microfono non disponibile: controlla i permessi del browser.', true);
    rec = null;
  }
}

function stopRec(cancel) {
  if (!rec) return;
  rec.cancelled = !!cancel;
  try { rec.mr.stop(); } catch (e) { }
}

async function pickQuestionAudio(qid) {
  const files = await filePicker('audio/*,.opus,.ogg,.m4a,.mp3,.wav,.aac', false);
  if (!files.length) return;
  const f = files[0];
  if (f.size > 25 * 1024 * 1024) { toast('Audio troppo grande (max 25 MB).', true); return; }
  const data = await blobToDataURL(f);
  const dur = await audioDuration(data);
  const a = ensureAnswer(qid);
  a.clips.push({ id: uid(), name: f.name ? f.name.replace(/\.[^.]+$/, '') : 'audio', dur, data, tr: '' });
  renderAtt(qid); updateCounts(); queueSave();
  toast('Audio allegato');
}

function blobToDataURL(blob) {
  return new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
}

function audioDuration(src) {
  return new Promise(res => {
    try {
      const a = new Audio();
      a.onloadedmetadata = () => res(Number.isFinite(a.duration) ? a.duration : 0);
      a.onerror = () => res(0);
      a.src = src;
    } catch (e) { res(0); }
  });
}

async function transcribeClip(clip, btn) {
  if (!clip.data) return;
  const old = btn.textContent;
  btn.textContent = 'Trascrivo…'; btn.disabled = true;
  try {
    const blob = await (await fetch(clip.data)).blob();
    const chunks = await transcribeBlob(blob, null);
    clip.tr = (chunks.text || '').trim();
    btn.textContent = 'Testo';
    const box = btn.closest('.clip');
    if (box) { box.querySelector('.tr').textContent = clip.tr; box.classList.add('open'); }
    queueSave();
  } catch (e) {
    btn.textContent = old; btn.disabled = false;
    toast('Trascrizione non riuscita: ' + (e.message || 'errore'), true);
  }
}

/* ============================================================
   Vocale principale: upload, decodifica, Whisper
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

async function transcribeBlob(blob, onStatus) {
  const status = onStatus || (() => { });
  status('decode');
  const { audio, duration } = await decodeTo16k(blob);
  const res = await runWhisper(audio,
    p => status('model', p),
    () => status('run')
  );
  const text = (res && res.text ? res.text : '').trim();
  let chunks = [];
  if (res && Array.isArray(res.chunks) && res.chunks.length) {
    chunks = res.chunks.map(c => ({
      text: (c.text || '').trim(),
      start: Array.isArray(c.timestamp) && c.timestamp[0] != null ? c.timestamp[0] : 0,
      end: Array.isArray(c.timestamp) && c.timestamp[1] != null ? c.timestamp[1] : duration
    })).filter(c => c.text);
  }
  if (!chunks.length && text) chunks = [{ text, start: 0, end: duration }];
  return { text, chunks, duration };
}

function setProg(pct, label) {
  const bar = $('#progFill'), t = $('#progText'), p = $('#progPct');
  if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  if (t) t.textContent = label;
  if (p) p.textContent = Math.round(Math.max(0, Math.min(100, pct))) + '%';
}

async function onVoiceFile(file) {
  if (!file) return;
  if (!/^audio\//.test(file.type) && !/\.(mp3|ogg|oga|opus|m4a|wav|aac|amr)$/i.test(file.name || '')) {
    toast('Scegli un file audio (MP3, OGG, M4A, WAV).', true); return;
  }
  if (file.size > 45 * 1024 * 1024) { toast('Il file supera 45 MB: prova a comprimerlo.', true); return; }
  if (S.tasks.length && !confirm('Caricando un nuovo vocale i compiti attuali vengono sostituiti. Continuare?')) return;

  if (S.voice.url) URL.revokeObjectURL(S.voice.url);
  S.voice = { name: file.name || 'vocale', size: file.size, url: URL.createObjectURL(file), duration: 0, transcript: '', chunks: [], status: 'loaded', manual: false, file };
  S.tasks = []; S.expanded = {};
  S.planDate = todayISO();
  renderTasks(); showSummary(); updateCounts(); queueSave();

  const a = $('#audio');
  a.onloadedmetadata = () => {
    S.voice.duration = a.duration || 0;
    if (S.voice.duration > 600) {
      toast('Il vocale dura ' + fmt(S.voice.duration) + ': il massimo è 10 minuti. Dividilo in due parti.', true);
    } else if (S.voice.duration > 300) {
      toast('Vocale lungo (' + fmt(S.voice.duration) + '): la trascrizione può richiedere diversi minuti.');
    }
    updateVoiceUI();
  };
  a.onerror = () => toast('Questo formato audio non è leggibile dal browser. Prova MP3 o M4A.', true);
  a.src = S.voice.url;
  $('#upEmpty').hidden = true;
  $('#upFilled').hidden = false;
  $('#drop').classList.add('has-file');
  updateVoiceUI();
}

function updateVoiceUI() {
  const v = S.voice;
  $('#vbName').textContent = v.name || 'vocale';
  const bits = [];
  if (v.manual) {
    bits.push('testo incollato');
  } else {
    if (v.duration) bits.push(fmt(v.duration));
    if (v.size) bits.push((v.size / 1024 / 1024).toFixed(1) + ' MB');
    bits.push('audio locale');
  }
  $('#vbSub').textContent = bits.join(' · ');
  const au = $('#audio');
  if (au) au.style.display = v.url ? '' : 'none';
  $('#aiBtn').style.display = v.manual ? 'none' : '';
  $('#aiBtn').disabled = v.status === 'loading' || v.status === 'running';
  if (v.status === 'done') {
    $('#aiBtn').innerHTML = '<svg><use href="#i-refresh"/></svg> Rielabora';
    $('#aiNote').textContent = v.chunks.length ? 'Trascrizione pronta. Controlla i compiti qui sotto.' : '';
  } else {
    $('#aiBtn').innerHTML = '<svg><use href="#i-spark"/></svg> Trascrivi e assegna';
    $('#aiNote').textContent = 'La prima volta scarica il modello AI (≈75 MB). Poi resta in cache: la trascrizione può richiedere qualche minuto.';
  }
}

async function runAI() {
  const v = S.voice;
  if (!v.file && !v.url) { toast('Prima carica un vocale.', true); return; }
  if (v.duration > 600) { toast('Vocale troppo lungo: massimo 10 minuti.', true); return; }
  const file = v.file;
  if (!file) { toast('Ricarica il file audio: la sessione è stata ripristinata senza audio.', true); return; }

  v.status = 'loading';
  $('#aiBtn').disabled = true;
  $('#prog').hidden = false;
  setProg(3, 'Preparo l\'audio…');
  try {
    const blob = file;
    const res = await transcribeBlob(blob, (phase, p) => {
      if (phase === 'decode') setProg(6, 'Preparo l\'audio…');
      else if (phase === 'model') {
        if (p && p.status === 'progress' && p.total) {
          const pct = Math.min(70, 8 + (p.loaded / p.total) * 62);
          const nm = String(p.file || '').split('/').pop();
          setProg(pct, 'Scarico il modello AI… ' + (nm ? nm : ''));
        } else if (p && p.status === 'done') {
          setProg(72, 'Modello pronto…');
        }
      } else if (phase === 'run') {
        setProg(82, 'Trascrivo il vocale…');
      }
    });
    v.transcript = res.text;
    v.chunks = res.chunks;
    v.duration = res.duration || v.duration;
    v.status = 'done';
    setProg(100, 'Trascrizione completata');
    renderTranscript();
    const tasks = extractTasks(res.chunks);
    S.tasks = tasks.concat(S.tasks.filter(t => t.manual));
    S.planDate = todayISO();
    renderTasks(); showSummary(); updateCounts(); queueSave();
    updateVoiceUI();
    if (!tasks.length) {
      toast('Nessun compito riconosciuto: aggiungili a mano sotto le domande.', true);
    } else {
      toast(tasks.length + (tasks.length === 1 ? ' compito estratto' : ' compiti estratti') + ' dal vocale');
      setTimeout(() => $('#summary').scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
  } catch (e) {
    v.status = 'error';
    setProg(0, 'Errore: ' + (e.message || 'trascrizione non riuscita'));
    toast('Non riesco a trascrivere: ' + (e.message || 'errore') + '. Puoi incollare il testo.', true);
    $('#aiNote').textContent = 'Prova a ricaricare la pagina, oppure incolla la trascrizione dal riquadro iniziale.';
  } finally {
    $('#aiBtn').disabled = false;
    updateVoiceUI();
  }
}

function renderTranscript() {
  const v = S.voice;
  if (!v.chunks.length) { $('#trDetails').hidden = true; return; }
  $('#trDetails').hidden = false;
  const n = v.chunks.length;
  $('#trCount').textContent = '· ' + n + (n === 1 ? ' passaggio' : ' passaggi');
  $('#trBody').innerHTML = v.chunks.map(c =>
    `<p>${S.voice.url ? `<button class="tr-time" type="button" data-tr-time="${c.start}">${fmt(c.start)}</button>` : ''}${esc(c.text)}</p>`
  ).join('');
}

/* ---------- estrazione compiti ---------- */

const LEX = {
  giro: ['giro', 'servizio', 'civile', 'industriale', 'reception', 'azienda', 'ufficio', 'uffici', 'produzione', 'magazzino', 'spogliatoio', 'spogliatoi', 'bagno', 'bagni', 'esterno', 'esterni', 'piano', 'piani', 'scala', 'scale', 'ascensore', 'montacarichi', 'badge', 'formazione', 'laboratorio', 'lab', 'cella', 'celle', 'frigo', 'corridoio', 'corridoi', 'entrata', 'ingresso', 'sala', 'mensa', 'archivio', 'parcheggio', 'vetro', 'vetri', 'portineria'],
  orari: ['orario', 'orari', 'fascia', 'turno', 'turni', 'mattina', 'pomeriggio', 'sera', 'pausa', 'pause', 'settimana', 'settimanale', 'mensile', 'trimestre', 'annuale', 'straordinario', 'straordinari', 'frequenza', 'tutti i giorni', 'una volta', 'ogni giorno', 'ogni settimana', 'ogni mese', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'],
  prodotti: ['prodotto', 'prodotti', 'ecolabel', 'carta', 'sapone', 'detersivo', 'detersivi', 'detergente', 'detergenti', 'materiale', 'fornire', 'forniamo', 'fornitura', 'sacchi', 'panno', 'panni', 'dispenser', 'carta igienica', 'carta asciugamani'],
  vizi: ['macchinetta', 'spazzatura', 'rifiuti', 'immondizia', 'pattumiera', 'pattumiere', 'differenziata', 'conferire', 'conferimento', 'umido', 'plastica', 'vetro', 'sacchetto', 'sacchetti'],
  chiavi: ['chiave', 'chiavi', 'badge', 'allarme', 'registro', 'firma', 'firme', 'timbratura', 'timbrare', 'dpi', 'rischio', 'rischi', 'guanti', 'mascherina', 'occhiali', 'scarpe', 'antiscivolo', 'documenti', 'procedura', 'procedure', 'primo accesso', 'cancello', 'portone', 'codice', 'disarmare', 'armare', 'tesserino', 'chiavetta'],
  attrezzature: ['attrezzatura', 'attrezzature', 'lavasciuga', 'lavamoquette', 'carrello', 'carrelli', 'mocio', 'aspirapolvere', 'scopa', 'scopino', 'secchio', 'secchi', 'macchina', 'macchinario', 'deposito', 'ripostiglio', 'magazzino', 'armadio', 'presa', 'acqua', 'carica', 'aspiraliquidi', 'monospazzola', 'idropulitrice']
};

const BOOST = {
  orari: ['tutti i giorni', 'una volta a settimana', 'una volta al mese', 'ogni settimana', 'ogni mese', 'ogni giorno', 'al giorno', 'di settimana'],
  vizi: ['spazzatura', 'rifiuti', 'differenziata', 'conferire', 'pattumiera'],
  chiavi: ['allarme', 'chiavi', 'badge', 'dpi', 'registro firme', 'timbratura'],
  prodotti: ['ecolabel', 'carta e sapone', 'carta igienica', 'sapone', 'detersivo'],
  attrezzature: ['lavasciuga', 'dove le troviamo', 'dove sono', 'attrezzature'],
  giro: ['ufficio', 'bagno', 'corridoio', 'piano', 'magazzino', 'produzione', 'spogliatoio', 'reception']
};

const ACTION = ['pulisci', 'pulire', 'svuota', 'svuotare', 'spazza', 'spazzare', 'lava', 'lavare', 'lavaggio', 'passa', 'passare', 'fai', 'fare', 'metti', 'mettere', 'lascia', 'lasciare', 'chiudi', 'chiudere', 'apri', 'aprire', 'conferisci', 'butta', 'buttare', 'porta', 'portare', 'usa', 'usare', 'verifica', 'verificare', 'segna', 'segnare', 'timbra', 'controlla', 'controllare', 'ricordati', 'bisogna', 'devi', 'dovete', 'serve', 'servono', 'occupa', 'occuparsi', 'pulizia', 'polveri', 'scopatura', 'deragnatura', 'sanificare', 'disinfettare'];

function classifySection(text) {
  const t = ' ' + norm(text) + ' ';
  const sc = {};
  for (const sec of Object.keys(LEX)) {
    let v = 0;
    for (const w of LEX[sec]) {
      if (t.includes(' ' + norm(w) + ' ')) v += (sec === 'giro' ? 2 : (w.includes(' ') ? 2 : 1));
    }
    for (const w of BOOST[sec] || []) if (t.includes(' ' + norm(w) + ' ')) v += 2;
    sc[sec] = v;
  }
  let best = 'giro', bv = 0;
  for (const k of ['orari', 'vizi', 'chiavi', 'prodotti', 'attrezzature']) {
    if (sc[k] > bv) { bv = sc[k]; best = k; }
  }
  return bv > sc.giro ? best : 'giro';
}

function cleanSentence(t) {
  let s = String(t || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(?:e\s+)?(?:poi|dopo|quindi|allora|adesso|ora|ok|okay|eh|e)\s+/i, '');
  s = s.replace(/^(?:mi raccomando|ricordati|ricordate|ricorda)\s+(?:di\s+|che\s+)?/i, '');
  s = s.replace(/[,;:]+([.!?])$/, '$1');
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1);
  if (s && !/[.!?]$/.test(s)) s += '.';
  return s;
}

function splitSentences(text) {
  return String(text || '')
    .replace(/([.!?…])\s+/g, '$1|')
    .split('|')
    .flatMap(s => s.split(/\s+(?=(?:poi|dopo|quindi|allora|però|invece|adesso|ora)\s+)/i))
    .flatMap(s => s.split(/\s+(?=(?:devi|dovete|bisogna|ricordati|ricordate|mi raccomando)\b)/i))
    .map(cleanSentence)
    .filter(Boolean);
}

function isTaskLike(s) {
  const n = ' ' + norm(s) + ' ';
  if (n.trim().split(' ').length < 5) return false;
  const hasAction = ACTION.some(a => n.includes(' ' + a + ' '));
  if (hasAction) return true;
  return Object.values(LEX).some(arr => arr.some(w => n.includes(' ' + norm(w) + ' ')));
}

function extractTasks(chunks) {
  const parts = (chunks || []).map(c => ({
    text: String(c.text || '').trim(),
    start: Number(c.start) || 0,
    end: Number(c.end) || 0
  })).filter(p => p.text);
  if (!parts.length) return [];

  // unisco i passaggi in un testo continuo, tenendo la mappa carattere → tempo
  let full = '', cursor = 0;
  const spans = [];
  for (const p of parts) {
    if (full) { full += ' '; cursor++; }
    spans.push({ from: cursor, to: cursor + p.text.length, start: p.start, end: p.end });
    full += p.text;
    cursor += p.text.length;
  }

  const timeAt = idx => {
    for (const sp of spans) {
      if (idx >= sp.from && idx <= sp.to) {
        const f = (idx - sp.from) / Math.max(1, sp.to - sp.from);
        return sp.start + (sp.end - sp.start) * f;
      }
    }
    return idx < 0 ? 0 : spans[spans.length - 1].end;
  };

  // frasi: punteggiatura forte; poi i marcatori di discorso
  const sentences = [];
  const re = /([^.!?…]+[.!?…]+|[^.!?…]+$)/g;
  let m;
  while ((m = re.exec(full)) !== null) {
    const raw = m[1];
    if (!raw.trim()) continue;
    const base = m.index;
    const re2 = /\s+(?=(?:poi|dopo|quindi|allora|però|invece)\s+)/gi;
    let last = 0, mm;
    while ((mm = re2.exec(raw)) !== null) {
      const seg = raw.slice(last, mm.index);
      if (seg.trim()) sentences.push({ from: base + last, to: base + mm.index });
      last = mm.index + mm[0].length;
    }
    const seg = raw.slice(last);
    if (seg.trim()) sentences.push({ from: base + last, to: base + raw.length });
  }
  if (!sentences.length) sentences.push({ from: 0, to: full.length });

  // frasi troppo lunghe: spezzo sulle virgole in blocchi leggibili
  const pieces = [];
  for (const p of sentences) {
    const raw = full.slice(p.from, p.to);
    if (raw.length <= 240) { pieces.push(p); continue; }
    const clauses = [];
    const rc = /[^,;]+[,;]?/g;
    let cm;
    while ((cm = rc.exec(raw)) !== null) {
      if (cm[0].trim()) clauses.push({ from: p.from + cm.index, to: p.from + cm.index + cm[0].length });
    }
    let cur = null;
    for (const c of clauses) {
      if (!cur) cur = { from: c.from, to: c.to };
      else if ((cur.to - cur.from) + (c.to - c.from) <= 240) cur.to = c.to;
      else { pieces.push(cur); cur = { from: c.from, to: c.to }; }
    }
    if (cur) pieces.push(cur);
  }

  const out = [];
  const seen = new Set();
  for (const p of pieces) {
    const text = cleanSentence(full.slice(p.from, p.to));
    if (!isTaskLike(text)) continue;
    const key = norm(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: uid(), text, quote: text, section: classifySection(text),
      start: timeAt(p.from), end: timeAt(Math.max(p.from, p.to - 1)),
      photos: [], manual: false
    });
    if (out.length >= 60) break;
  }
  return out;
}

function extractFromText(text) {
  return extractTasks([{ text: String(text || ''), start: 0, end: 0 }]).map(t => ({ ...t, start: null, end: null }));
}

/* ============================================================
   Link condivisibile (compiti nel frammento URL)
   ============================================================ */

function b64url(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function packPlan(plan) {
  const json = new TextEncoder().encode(JSON.stringify(plan));
  if (window.CompressionStream) {
    try {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const buf = new Uint8Array(await new Response(stream).arrayBuffer());
      return 'g' + b64url(buf);
    } catch (e) { /* fallback */ }
  }
  return 'j' + b64url(json);
}

async function unpackPlan(code) {
  const bytes = unb64url(String(code).slice(1));
  let json = bytes;
  if (code[0] === 'g') {
    if (!window.DecompressionStream) throw new Error('Browser non supportato');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    json = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return JSON.parse(new TextDecoder().decode(json));
}

async function buildShareUrl() {
  const plan = {
    v: 1,
    o: S.planOwner || 'Global Behring',
    s: S.profile.site || '',
    d: S.planDate || todayISO(),
    t: S.tasks.map(t => ({ q: t.quote, s: t.section }))
  };
  const code = await packPlan(plan);
  return location.href.split('#')[0] + '#m=' + code;
}

function applyPlan(plan) {
  S.mode = 'employee';
  S.tasks = (plan.t || []).map(t => ({ id: uid(), quote: t.q, text: t.q, section: SECMAP[t.s] ? t.s : 'giro', start: null, end: null, photos: [], manual: true }));
  if (plan.s) S.profile.site = plan.s;
  S.planDate = plan.d || '';
  S.planOwner = plan.o || 'Global Behring';
}

async function checkHash() {
  const m = location.hash.match(/[#&]m=([^&]+)/);
  if (!m) return false;
  try {
    const plan = await unpackPlan(m[1]);
    if (!plan || !Array.isArray(plan.t)) throw new Error('formato');
    const fp = JSON.stringify(plan.t) + '|' + (plan.d || '');
    const same = !!S.planFp && S.planFp === fp;
    applyPlan(plan);
    S.planFp = fp;
    return { ok: true, same };
  } catch (e) {
    toast('Il link del modulo non è valido o è incompleto.', true);
    return false;
  }
}

/* ============================================================
   Modalità dipendente / referente
   ============================================================ */

function applyMode() {
  const emp = S.mode === 'employee';
  $('#hero').style.display = emp ? 'none' : '';
  $('#summary').classList.toggle('on', !emp && S.tasks.length > 0);
  $('#empbar').classList.toggle('on', emp);
  const ib = $('#archiveBtn'); if (ib) ib.style.display = emp ? 'none' : '';
  if (emp) {
    $('#empTitle').textContent = 'Compiti assegnati';
    const date = S.planDate ? itDate(S.planDate) : itDate(todayISO());
    const n = S.tasks.length;
    $('#empSub').textContent = `${n === 1 ? '1 compito' : n + ' compiti'} · ${date} · ${S.planOwner}`;
    $('#noVoice').style.display = 'none';
    document.title = 'Modulo del dipendente · Global Behring';
  } else {
    $('#noVoice').style.display = (S.tasks.length || S.voice.url) ? 'none' : 'flex';
  }
}

/* ============================================================
   Consegna, report, archivio
   ============================================================ */

function answeredCount() { return QLIST.filter(q => isAnswered(q.id)).length; }

function currentSubmission() {
  return {
    type: 'gb-modulo', v: 1,
    createdAt: new Date().toISOString(),
    employee: { name: S.profile.name.trim(), site: S.profile.site.trim(), date: S.profile.date || todayISO() },
    plan: { owner: S.planOwner, date: S.planDate || '', tasks: S.tasks.map(t => ({ q: t.quote, s: t.section, ph: t.photos || [] })) },
    answers: JSON.parse(JSON.stringify(S.answers))
  };
}

function statsOf(sub) {
  let photos = 0, clips = 0, answers = 0;
  for (const q of QLIST) {
    const a = (sub.answers || {})[q.id];
    if (!a) continue;
    if ((a.text || '').trim() || (a.choices || []).length) answers++;
    photos += (a.photos || []).length;
    clips += (a.clips || []).length;
  }
  const taskPhotos = ((sub.plan && sub.plan.tasks) || []).reduce((n, t) => n + ((t.ph || []).length), 0);
  return { answers, photos: photos + taskPhotos, clips, total: QLIST.length };
}

function openSubmit() {
  if (!S.profile.name.trim()) {
    const el = $('#fName');
    el.classList.add('err'); el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Scrivi nome e cognome prima di consegnare.', true);
    return;
  }
  $('#fName').classList.remove('err');
  const sub = currentSubmission();
  const st = statsOf(sub);
  if (st.answers === 0 && !confirm('Non hai risposto a nessuna domanda. Consegni comunque il modulo?')) return;
  $('#subTitle').textContent = `${sub.employee.name} · ${itDate(sub.employee.date)}${sub.employee.site ? ' · ' + sub.employee.site : ''}`;
  $('#subStats').innerHTML = `<div class="stat"><b>${st.answers}/${st.total}</b><span>risposte</span></div><div class="stat"><b>${st.photos}</b><span>foto</span></div><div class="stat"><b>${st.clips}</b><span>vocali</span></div>`;
  $('#submitDlg').dataset.pending = JSON.stringify(sub);
  saveArchive(sub);
  $('#submitDlg').showModal();
}

function fileName(sub, ext) {
  const n = (sub.employee.name || 'dipendente').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return 'Modulo-' + (n || 'dipendente') + '-' + (sub.employee.date || todayISO()) + '.' + ext;
}

function reportHTML(sub) {
  const st = statsOf(sub);
  const secs = SECTIONS.map(sec => {
    const qs = sec.questions.map(q => {
      const a = (sub.answers || {})[q.id] || {};
      const has = (a.text || '').trim() || (a.choices || []).length || (a.photos || []).length || (a.clips || []).length;
      if (!has) return '';
      const photos = (a.photos || []).map((p, i) => `<figure><img src="${p}" alt="Foto ${i + 1}"></figure>`).join('');
      const clips = (a.clips || []).map(c => `<div class="c"><b>Nota vocale · ${fmt(c.dur)}</b>${c.tr ? '<p>' + esc(c.tr) + '</p>' : '<p class="m">Trascrizione non disponibile.</p>'}</div>`).join('');
      return `<div class="q"><p class="ql">${esc(q.label)}</p>
        ${(a.choices || []).length ? '<p class="ch">' + a.choices.map(esc).join(' · ') + '</p>' : ''}
        ${(a.text || '').trim() ? '<p class="at">' + esc(a.text).replace(/\n/g, '<br>') + '</p>' : ''}
        ${photos ? '<div class="ph">' + photos + '</div>' : ''}
        ${clips}
      </div>`;
    }).join('');
    const planTasks = (sub.plan && Array.isArray(sub.plan.tasks)) ? sub.plan.tasks.map(t => ({ quote: t.q, section: t.s, photos: t.ph || [] })) : (S.tasks || []).map(t => ({ quote: t.quote, section: t.section, photos: t.photos || [] }));
    const tasks = planTasks.filter(t => t.section === sec.id).map(t => `<div class="tk"><span>${esc(sec.title)}</span>${esc(t.quote)}${(t.photos || []).length ? '<div class="tph">' + t.photos.map(p => `<img src="${p}" alt="Prova del compito">`).join('') + '</div>' : ''}</div>`).join('');
    if (!qs && !tasks) return '';
    return `<section><h2>${esc(sec.title)}</h2>${tasks}${qs || '<p class="m">Nessuna risposta.</p>'}</section>`;
  }).join('');

  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Modulo ${esc(sub.employee.name)} · ${esc(itDate(sub.employee.date))}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f8fd;color:#0b1b2b;font:16px/1.55 'Segoe UI',system-ui,-apple-system,Arial,sans-serif}
.w{max-width:820px;margin:0 auto;padding:28px 20px 60px}
.hd{background:linear-gradient(140deg,#0b76e8,#075fc4);color:#fff;border-radius:16px;padding:22px 24px;margin-bottom:18px}
.hd small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.8}
.hd h1{margin:6px 0 4px;font-size:26px;letter-spacing:-.02em}
.hd p{margin:0;opacity:.9;font-size:14px}
.st{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 22px}
.st div{background:#fff;border:1px solid #dbe8f6;border-radius:10px;padding:8px 12px;font-size:12px;color:#597084}
.st b{display:block;color:#075fc4;font-size:17px}
section{background:#fff;border:1px solid #dbe8f6;border-radius:14px;padding:18px 20px;margin:0 0 14px}
h2{font-size:18px;margin:0 0 10px;color:#0b1b2b}
.tk{border-left:3px solid #0b76e8;background:#f2f9ff;border-radius:8px;padding:8px 11px;margin:0 0 8px;font-size:14px}
.tk span{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#0757b0;margin-bottom:2px}
.tph{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.tph img{width:110px;height:110px;object-fit:cover;border-radius:7px;border:1px solid #cfe4fb}
.q{border-top:1px solid #eaf1fa;padding:12px 0}.q:first-of-type{border-top:0}
.ql{font-weight:600;font-size:14px;margin:0 0 4px}
.ch{display:inline-block;background:#eaf4ff;color:#075fc4;border-radius:99px;padding:2px 9px;font-size:12px;margin:0 4px 4px 0}
.at{margin:4px 0;font-size:14.5px;white-space:pre-wrap}
.ph{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}.ph figure{margin:0}
.ph img{width:150px;height:150px;object-fit:cover;border-radius:9px;border:1px solid #dbe8f6}
.c{background:#fbfdff;border:1px dashed #cfe0f2;border-radius:8px;padding:7px 10px;margin-top:6px;font-size:13px}
.c b{font-size:11px;color:#597084;display:block;margin-bottom:2px}
.m{color:#7b90a4;font-size:13px}
.ft{color:#7b90a4;font-size:11px;text-align:center;margin-top:18px}
@media print{body{background:#fff}.w{max-width:none}.hd{border-radius:0}section{break-inside:avoid}}
</style></head><body><div class="w">
<div class="hd"><small>Global Behring · modulo comunicazione</small><h1>${esc(sub.employee.name)}</h1><p>${esc(itDate(sub.employee.date))}${sub.employee.site ? ' · ' + esc(sub.employee.site) : ''}</p></div>
<div class="st"><div><b>${st.answers}/${st.total}</b>risposte</div><div><b>${st.photos}</b>foto</div><div><b>${st.clips}</b>vocali</div><div><b>${(sub.plan.tasks || []).length}</b>compiti</div></div>
${secs}
<div class="ft">Report generato il ${esc(new Date().toLocaleString('it-IT'))} · i dati sono rimasti sul dispositivo del dipendente.</div>
</div></body></html>`;
}

function renderArch() {
  const list = readArchive();
  const box = $('#archList');
  if (!list.length) {
    box.innerHTML = '<div class="empty">Nessun modulo salvato. Consegna un modulo oppure importa un file .json.</div>';
  } else {
    box.innerHTML = list.map(r => `<div class="arch" data-aid="${r.id}">
      <span class="a-ic"><svg><use href="#i-file"/></svg></span>
      <div class="a-t"><b>${esc(r.employee.name || 'Senza nome')}</b><span>${esc(itDate(r.employee.date))} · ${r.counts.answers}/${r.counts.total} risposte · ${r.counts.photos} foto</span></div>
      <div class="a-act">
        <button type="button" data-areport="${r.id}" title="Scarica report"><svg><use href="#i-download"/></svg></button>
        <button type="button" data-ajson="${r.id}" title="Scarica dati"><svg><use href="#i-file"/></svg></button>
        <button type="button" class="del" data-adel="${r.id}" title="Elimina"><svg><use href="#i-trash"/></svg></button>
      </div>
    </div>`).join('');
  }
}

function openArchive() {
  renderArch();
  const d = $('#archDlg');
  if (d.open) return;
  d.showModal();
}

function readArchive() {
  try { const a = JSON.parse(localStorage.getItem(STORE_ARCH) || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}

function writeArchive(list) {
  try { localStorage.setItem(STORE_ARCH, JSON.stringify(list.slice(0, 12))); }
  catch (e) {
    try {
      const slim = list.map(r => ({ ...r, answers: Object.fromEntries(Object.entries(r.answers || {}).map(([k, a]) => [k, { ...a, photos: [] }])) }));
      localStorage.setItem(STORE_ARCH, JSON.stringify(slim.slice(0, 12)));
    } catch (e2) { }
  }
}

function saveArchive(sub) {
  const list = readArchive();
  const counts = statsOf(sub);
  list.unshift({ id: uid(), createdAt: sub.createdAt, employee: sub.employee, answers: sub.answers, plan: sub.plan, counts });
  writeArchive(list);
}

function archiveById(id) { return readArchive().find(r => r.id === id); }

function subFromArchive(r) {
  return { type: 'gb-modulo', v: 1, createdAt: r.createdAt, employee: r.employee, plan: r.plan, answers: r.answers };
}

function summaryText(sub) {
  const lines = [];
  lines.push('MODULO · ' + (sub.employee.name || '') + ' · ' + itDate(sub.employee.date));
  if (sub.employee.site) lines.push(sub.employee.site);
  lines.push('');
  for (const sec of SECTIONS) {
    const items = [];
    for (const q of sec.questions) {
      const a = (sub.answers || {})[q.id] || {};
      const bits = [];
      if ((a.choices || []).length) bits.push(a.choices.join(', '));
      if ((a.text || '').trim()) bits.push(a.text.trim());
      if (!bits.length) continue;
      items.push('• ' + q.label + ' ' + bits.join(' — '));
    }
    if (items.length) { lines.push(sec.title.toUpperCase()); lines.push(...items); lines.push(''); }
  }
  const st = statsOf(sub);
  lines.push(`${st.answers}/${st.total} risposte · ${st.photos} foto · ${st.clips} vocali`);
  return lines.join('\n');
}

/* ============================================================
   Eventi globali
   ============================================================ */

function bindStatic() {
  // upload
  const drop = $('#drop');
  const fileInput = $('#voiceFile');
  const openPicker = () => fileInput.click();
  $('#pickBtn').addEventListener('click', openPicker);
  $('#pickBtn2').addEventListener('click', openPicker);
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) onVoiceFile(fileInput.files[0]); fileInput.value = ''; });

  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onVoiceFile(f);
  });

  $('#aiBtn').addEventListener('click', runAI);
  $('#vbRemove').addEventListener('click', () => {
    if (S.tasks.length && !confirm('Vuoi rimuovere il vocale e i compiti estratti?')) return;
    if (S.voice.url) URL.revokeObjectURL(S.voice.url);
    S.voice = { name: '', size: 0, url: '', duration: 0, transcript: '', chunks: [], status: 'idle', manual: false };
    S.tasks = []; S.expanded = {};
    $('#upEmpty').hidden = false; $('#upFilled').hidden = true;
    $('#drop').classList.remove('has-file');
    $('#prog').hidden = true; $('#trDetails').hidden = true;
    $('#audio').removeAttribute('src'); $('#audio').load();
    renderTasks(); showSummary(); updateCounts(); queueSave();
  });

  $('#trBody').addEventListener('click', e => {
    const b = e.target.closest('[data-tr-time]');
    if (!b) return;
    playSegment(Number(b.dataset.trTime), null);
  });

  // profilo
  ['name', 'site', 'date'].forEach(k => {
    const el = $('#f' + k.charAt(0).toUpperCase() + k.slice(1));
    el.addEventListener('input', () => {
      S.profile[k] = el.value;
      if (k === 'name') el.classList.remove('err');
      queueSave();
    });
  });

  // summary
  $('#shareBtn').addEventListener('click', async () => {
    if (!S.tasks.length) { toast('Prima carica un vocale.', true); return; }
    const url = await buildShareUrl();
    $('#shareUrl').value = url;
    $('#shareDlg').dataset.url = url;
    $('#shareDlg').showModal();
  });
  $('#scrollBtn').addEventListener('click', () => $('#modulo').scrollIntoView({ behavior: 'smooth' }));

  $('#copyBtn').addEventListener('click', async () => {
    const ta = $('#shareUrl'); ta.select();
    try { await navigator.clipboard.writeText(ta.value); toast('Link copiato'); }
    catch (e) { document.execCommand('copy'); toast('Link copiato'); }
  });
  $('#shareWa').addEventListener('click', () => {
    const url = $('#shareUrl').value;
    const txt = 'Ciao, ecco il modulo di oggi da compilare: ' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
  });
  $('#sharePreview').addEventListener('click', () => window.open($('#shareUrl').value, '_blank'));

  // submit
  $('#submitBtn').addEventListener('click', openSubmit);
  $('#subHtml').addEventListener('click', () => {
    const sub = JSON.parse($('#submitDlg').dataset.pending || '{}');
    download(fileName(sub, 'html'), reportHTML(sub), 'text/html;charset=utf-8');
    toast('Report scaricato');
  });
  $('#subJson').addEventListener('click', () => {
    const sub = JSON.parse($('#submitDlg').dataset.pending || '{}');
    download(fileName(sub, 'json'), JSON.stringify(sub, null, 1), 'application/json');
    toast('Dati scaricati');
  });
  $('#subCopy').addEventListener('click', async () => {
    const sub = JSON.parse($('#submitDlg').dataset.pending || '{}');
    try { await navigator.clipboard.writeText(summaryText(sub)); toast('Riepilogo copiato'); }
    catch (e) { toast('Copia non disponibile su questo browser.', true); }
  });

  // archivio
  $('#archiveBtn').addEventListener('click', openArchive);
  $('#archList').addEventListener('click', e => {
    const rep = e.target.closest('[data-areport]');
    const js = e.target.closest('[data-ajson]');
    const del = e.target.closest('[data-adel]');
    if (rep || js) {
      const id = (rep || js).dataset.areport || (rep || js).dataset.ajson;
      const r = archiveById(id);
      if (!r) return;
      const sub = subFromArchive(r);
      if (rep) download(fileName(sub, 'html'), reportHTML(sub), 'text/html;charset=utf-8');
      else download(fileName(sub, 'json'), JSON.stringify(sub, null, 1), 'application/json');
    }
    if (del) {
      if (!confirm('Eliminare questo modulo dall\'archivio?')) return;
      writeArchive(readArchive().filter(r => r.id !== del.dataset.adel));
      renderArch();
    }
  });
  $('#importFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const sub = JSON.parse(await f.text());
      if (sub.type !== 'gb-modulo' || !sub.answers) throw new Error('formato');
      const counts = statsOf(sub);
      writeArchive([{ id: uid(), createdAt: sub.createdAt || new Date().toISOString(), employee: sub.employee || { name: 'Senza nome' }, answers: sub.answers, plan: sub.plan || { tasks: [] }, counts }, ...readArchive()]);
      toast('Modulo importato');
      renderArch();
    } catch (err) { toast('File non valido: serve un .json esportato da questo modulo.', true); }
  });

  // dialog chiusura
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d) d.close();
      const c = e.target.closest('[data-close]');
      if (c) d.close();
    });
  });

  // reset
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Svuotare tutte le risposte, le foto e i vocali del modulo?')) return;
    S.answers = {};
    fillForm(); updateCounts(); saveNow();
    toast('Modulo svuotato');
  });

  // registrazione
  $('#recStop').addEventListener('click', () => stopRec(false));
  $('#recCancel').addEventListener('click', () => stopRec(true));

  // incolla trascrizione
  $('#pasteBtn').addEventListener('click', () => { $('#pasteText').value = ''; $('#pasteDlg').showModal(); });
  $('#pasteOk').addEventListener('click', () => {
    const txt = $('#pasteText').value.trim();
    if (!txt) { toast('Incolla il testo del vocale.', true); return; }
    const tasks = extractFromText(txt);
    S.tasks = tasks;
    S.voice = { name: 'Trascrizione incollata', size: 0, url: '', duration: 0, transcript: txt, chunks: [{ text: txt, start: 0, end: 0 }], status: 'done', manual: true };
    S.planDate = todayISO();
    $('#pasteDlg').close();
    $('#upEmpty').hidden = true; $('#upFilled').hidden = false; $('#drop').classList.add('has-file');
    $('#prog').hidden = true;
    updateVoiceUI(); renderTranscript();
    renderTasks(); showSummary(); updateCounts(); queueSave();
    toast(tasks.length + (tasks.length === 1 ? ' compito estratto' : ' compiti estratti'));
    setTimeout(() => $('#summary').scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  });

  // aggiungi compito
  $('#taskOk').addEventListener('click', () => {
    const text = $('#taskText').value.trim();
    if (!text) { toast('Scrivi il compito.', true); return; }
    const section = $('#taskSec').value;
    S.tasks.push({ id: uid(), text, quote: text, section, start: null, end: null, photos: [], manual: true });
    $('#taskDlg').close();
    renderTasks(); showSummary(); queueSave();
    toast('Compito aggiunto');
  });

  // tasto owner
  $('#ownerBtn').addEventListener('click', () => {
    if (answeredCount() && !confirm('Tornando alla vista referente perdi le risposte non consegnate. Continuare?')) return;
    location.href = location.pathname;
  });

  // tastiera: esc chiude i dialog (nativo), invio non invia
  window.addEventListener('hashchange', () => location.reload());
}

function openTaskDialog(sectionId) {
  $('#taskText').value = '';
  $('#taskSec').innerHTML = SECTIONS.map(s => `<option value="${s.id}"${s.id === sectionId ? ' selected' : ''}>${esc(s.title)}</option>`).join('');
  $('#taskDlg').showModal();
  setTimeout(() => $('#taskText').focus(), 50);
}

let segEnd = null;
function playSegment(start, end) {
  const a = $('#audio');
  if (!a.src) { toast('Audio non disponibile.', true); return; }
  a.currentTime = Math.max(0, Number(start) || 0);
  segEnd = end != null ? Number(end) : null;
  a.play().catch(() => { });
}
function bindAudioSegment() {
  const a = $('#audio');
  a.addEventListener('timeupdate', () => {
    if (segEnd != null && a.currentTime >= segEnd) { a.pause(); segEnd = null; }
  });
}

/* ============================================================
   Init
   ============================================================ */

function buildMockBars() {
  const box = $('#mockBars');
  if (!box) return;
  const hs = [8, 14, 20, 12, 24, 18, 26, 10, 22, 16, 24, 12, 18, 26, 14, 20, 10, 22, 16, 12, 24, 18, 14, 20, 10, 16];
  box.innerHTML = hs.map(h => `<i style="height:${h}px;opacity:${(0.3 + h / 40).toFixed(2)}"></i>`).join('');
}

async function init() {
  buildMockBars();
  renderSections();
  bindForm();
  bindStatic();
  bindAudioSegment();
  $('#fDate').value = todayISO();

  loadStored();
  S.mode = 'owner';
  const link = await checkHash();
  if (link && !link.same) { S.answers = {}; S.profile.name = ''; S.profile.date = todayISO(); }
  fillForm();
  applyMode();
  renderTasks();
  showSummary();
  updateCounts();
  updateVoiceUI();
  if (S.voice.url) { $('#upEmpty').hidden = true; $('#upFilled').hidden = false; $('#drop').classList.add('has-file'); }
  if (link && S.tasks.length) {
    setTimeout(() => toast(`${S.tasks.length === 1 ? '1 compito assegnato' : S.tasks.length + ' compiti assegnati'} · compila il modulo`), 400);
  }
}

document.addEventListener('DOMContentLoaded', init);
