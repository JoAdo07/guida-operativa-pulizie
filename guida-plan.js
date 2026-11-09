/* Global Behring · applica alla guida il piano generato dal responsabile */
(function () {
  var raw = null;
  try {
    var m = location.hash.match(/[#&]d=([^&]+)/);
    if (m && window.LZString) raw = LZString.decompressFromEncodedURIComponent(m[1]);
    if (!raw) raw = localStorage.getItem('gb-guida-plan');
    if (!raw) return;
    var p = JSON.parse(raw);
    if (!p || !Array.isArray(p.days)) return;
    if (m) { try { localStorage.setItem('gb-guida-plan', raw); } catch (e) {} }
    window.GB_PLAN = p;
    try {
      var h = m ? m[1] : '';
      if (m) {
        var old = localStorage.getItem('gb-plan-hash');
        if (old && old !== h) localStorage.removeItem('gb-checklist-v1');
        localStorage.setItem('gb-plan-hash', h);
      }
    } catch (e) { }
    apply(p);
  } catch (e) { if (window.console) console.warn('Piano non applicato:', e); }

  function tmin(t) { var a = String(t || '06:00').split(':'); return (+a[0] || 0) * 60 + (+a[1] || 0); }
  function norm(s, i) {
    var img = s.img && typeof IMG !== 'undefined' && IMG[s.img] ? s.img : 'ufficio';
    var acts = Array.isArray(s.acts) && s.acts.length ? s.acts : ['Completato'];
    return {
      t: s.t || ('Attività ' + (i + 1)), loc: s.loc || '', min: Math.max(0, Number(s.min) || 0),
      img: img, acts: acts.slice(0, 8), note: s.note || s.quote || null
    };
  }

  function apply(p) {
    var base = {
      lun: { label: 'Lunedì', short: 'Lun', sub: 'piano di lavoro', start: '06:00', end: '11:30' },
      mar: { label: 'Martedì e giovedì', short: 'Mar–Gio', sub: 'piano di lavoro', start: '06:00', end: '10:30' },
      mer: { label: 'Mercoledì', short: 'Mer', sub: 'piano di lavoro', start: '06:00', end: '12:30' }
    };
    var days = [];
    ['lun', 'mar', 'mer'].forEach(function (id) {
      var d = (p.days || []).filter(function (x) { return x.id === id; })[0];
      if (!d || !Array.isArray(d.steps) || !d.steps.length) return;
      var st = d.start || base[id].start, en = d.end || base[id].end;
      days.push({
        id: id, label: d.label || base[id].label, sub: d.sub || base[id].sub,
        start: st, end: en, dur: Math.max(0, tmin(en) - tmin(st)),
        steps: d.steps.map(norm)
      });
    });
    if (!days.length) return;

    DAYS.length = 0;
    days.forEach(function (d) { DAYS.push(d); });
    MONTHLY.length = 0;
    (p.monthly || []).forEach(function (s, i) { MONTHLY.push(norm(s, i)); });

    var r = p.rules || {};
    RULES.orari = r.orari || [];
    RULES.si = r.si || [];
    RULES.no = r.no || [];
    RULES.rischi = r.rischi || [];
    RULES.prodotti = r.prodotti || [];
    RULES.chiavi = r.chiavi || [];
    RULES.attrezzature = r.attrezzature || [];
    if (Array.isArray(r.glossario) && r.glossario.length) {
      LEX.length = 0;
      r.glossario.forEach(function (x) { LEX.push(x); });
    }

    // niente audio del vecchio capitolato quando c'è un piano nuovo
    Object.keys(AUDIO).forEach(function (k) { delete AUDIO[k]; });
    ['voiceAll', 'voiceRules'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });

    ['lun', 'mar', 'mer'].forEach(function (id) {
      var tab = document.getElementById('tab-' + id); if (!tab) return;
      var d = days.filter(function (x) { return x.id === id; })[0];
      if (!d) { tab.style.display = 'none'; return; }
      var full = tab.querySelector('.full'), short = tab.querySelector('.short');
      if (full) full.textContent = d.label;
      if (short) short.textContent = base[id].short;
      var panel = document.getElementById('p-' + id); if (panel) panel.dataset.label = d.label;
    });
    var mt = document.getElementById('tab-mes'); if (mt) mt.style.display = MONTHLY.length ? '' : 'none';

    var meta = p.meta || {};
    var kick = document.querySelector('.kicker');
    if (kick) kick.textContent = 'Piano di lavoro · dal vocale del responsabile';
    var lede = document.querySelector('.lede');
    if (lede) {
      var bits = [];
      if (meta.site) bits.push(meta.site);
      if (meta.referente) bits.push('referente ' + meta.referente);
      if (meta.updated) bits.push('aggiornato il ' + meta.updated);
      if (bits.length) lede.innerHTML = bits.map(function (x) { return '<strong>' + x + '</strong>'; }).join(' · ');
    }
    var badges = document.querySelector('.badges');
    if (badges) {
      var n = days.reduce(function (a, d) { return a + d.steps.length; }, 0) + MONTHLY.length;
      var rules = RULES.prodotti.length + RULES.chiavi.length + RULES.attrezzature.length;
      badges.innerHTML =
        '<span class="badge"><b>' + days.length + '</b> ' + (days.length === 1 ? 'giorno' : 'giorni') + '</span>' +
        '<span class="badge"><b>' + n + '</b> attività</span>' +
        '<span class="badge"><b>' + rules + '</b> ' + (rules === 1 ? 'regola' : 'regole') + '</span>' +
        '<span class="badge"><span class="bdot"></span>' + (meta.updated || 'piano attivo') + '</span>';
    }
    var sub = document.querySelector('#p-reg .panel-sub');
    if (sub) sub.textContent = 'Regolamenti, dotazioni e glossario ricavati dal vocale';
    var foot = document.querySelector('.footer p');
    if (foot) foot.innerHTML = '<strong style="color:var(--fg);font-weight:500">Global Behring</strong> · Guida operativa di pulizia<br>Piano generato dal vocale del responsabile' + (meta.updated ? ' · aggiornato il ' + meta.updated : '') + '.<br><span style="color:var(--muted-2)">Le spunte si salvano automaticamente su questo dispositivo. Consegna il rapporto dal pulsante in alto.</span>';

    setTimeout(function () {
      var on = document.querySelector('.panel.on');
      if (on && !on.querySelector('.card')) {
        var first = DAYS.filter(function (d) { return d.steps.length; })[0];
        if (first && typeof show === 'function') show(first.id);
      }
      fillExtra();
    }, 80);
  }

  function fillExtra() {
    var map = [
      ['u-prod', 'rc-prod', RULES.prodotti, '✓'],
      ['u-chiavi', 'rc-chiavi', RULES.chiavi, '!'],
      ['u-attrezzature', 'rc-att', RULES.attrezzature, '✓']
    ];
    var any = false;
    map.forEach(function (x) {
      var ul = document.getElementById(x[0]), card = document.getElementById(x[1]);
      if (!ul || !card) return;
      var arr = x[2] || [];
      ul.innerHTML = arr.map(function (s) {
        return '<li><span class="ic">' + x[3] + '</span><span>' + esc(s) + '</span></li>';
      }).join('');
      card.style.display = arr.length ? '' : 'none';
      if (arr.length) any = true;
    });
    var head = document.getElementById('regHead'), box = document.getElementById('regoleExtra');
    if (head) head.style.display = any ? 'flex' : 'none';
    if (box) box.style.display = any ? 'grid' : 'none';
    [['t-orari', RULES.orari.length], ['u-si', RULES.si.length], ['u-no', RULES.no.length], ['u-ris', RULES.rischi.length]].forEach(function (x) {
      var el = document.getElementById(x[0]);
      var card = el && el.closest('.rule-card');
      if (card) card.style.display = x[1] ? '' : 'none';
    });
  }
})();
