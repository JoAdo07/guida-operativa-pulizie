/* Global Behring · consegna del rapporto dal dispositivo del dipendente */
(function () {
  var btn = document.getElementById('deliverBtn');
  var dlg = document.getElementById('deliverDialog');
  if (!btn || !dlg) return;
  var nameInput = document.getElementById('deliverName');
  var stats = document.getElementById('deliverStats');
  var lastHTML = '';

  function panels() {
    var a = DAYS.map(function (d) { return { id: d.id, label: d.label, steps: d.steps }; });
    a.push({ id: 'mes', label: 'Servizio mensile', steps: MONTHLY });
    return a;
  }

  function collect() {
    var rows = [], done = 0, total = 0;
    panels().forEach(function (p) {
      p.steps.forEach(function (s, si) {
        var acts = (s.acts || []).map(function (a, ai) {
          var d = isDone(p.id, si, ai);
          if (d) done++;
          total++;
          return { a: a, done: d };
        });
        rows.push({ day: p.label, task: s.t, loc: s.loc, min: s.min, acts: acts });
      });
    });
    return { rows: rows, done: done, total: total };
  }

  function meta() {
    var m = (window.GB_PLAN && window.GB_PLAN.meta) || {};
    return {
      site: m.site || "Via dell'Industria 11, Castelli Calepio",
      referente: m.referente || 'Laura San Pellegrino'
    };
  }

  function open() {
    var c = collect();
    var pct = c.total ? Math.round(c.done / c.total * 100) : 0;
    stats.innerHTML = '<b>' + c.done + '/' + c.total + '</b><span>attività completate · ' + pct + '%</span>';
    nameInput.value = localStorage.getItem('gb-nome') || '';
    nameInput.classList.remove('err');
    if (!dlg.open) dlg.showModal();
    setTimeout(function () { nameInput.focus(); }, 60);
  }

  function validName() {
    var n = nameInput.value.trim();
    if (!n) {
      nameInput.classList.add('err');
      nameInput.focus();
      if (typeof showToast === 'function') showToast('Scrivi nome e cognome');
      return '';
    }
    localStorage.setItem('gb-nome', n);
    return n;
  }

  function reportHTML(name) {
    var c = collect(), m = meta();
    var date = new Date().toLocaleDateString('it-IT');
    var by = {};
    c.rows.forEach(function (r) { (by[r.day] = by[r.day] || []).push(r); });
    var sections = Object.keys(by).map(function (day) {
      return '<section><h2>' + esc(day) + '</h2>' + by[day].map(function (r) {
        var done = r.acts.filter(function (a) { return a.done; }).length;
        return '<div class="t"><div class="th"><h3>' + esc(r.task) + '</h3><span>' + done + '/' + r.acts.length + '</span></div>' +
          (r.loc ? '<p class="l">' + esc(r.loc) + (r.min ? ' · ' + r.min + ' min' : '') + '</p>' : '') +
          '<ul>' + r.acts.map(function (a) {
            return '<li class="' + (a.done ? 'd' : '') + '"><i>' + (a.done ? '✓' : '') + '</i>' + esc(a.a) + '</li>';
          }).join('') + '</ul></div>';
      }).join('') + '</section>';
    }).join('');

    return '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Rapporto ' + esc(name) + ' · ' + date + '</title><style>' +
      '*{box-sizing:border-box}body{margin:0;background:#f4f8fd;color:#0b1b2b;font:16px/1.55 "Segoe UI",system-ui,-apple-system,Arial,sans-serif}' +
      '.w{max-width:820px;margin:0 auto;padding:26px 18px 50px}' +
      '.hd{background:linear-gradient(140deg,#0b76e8,#075fc4);color:#fff;border-radius:16px;padding:22px 24px;margin-bottom:16px}' +
      '.hd small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.82}' +
      '.hd h1{margin:6px 0 3px;font-size:27px;letter-spacing:-.02em}.hd p{margin:0;font-size:14px;opacity:.92}' +
      '.st{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 20px}.st div{background:#fff;border:1px solid #dbe8f6;border-radius:10px;padding:8px 12px;font-size:12px;color:#597084}' +
      '.st b{display:block;color:#075fc4;font-size:18px}' +
      'section{background:#fff;border:1px solid #dbe8f6;border-radius:14px;padding:16px 18px;margin:0 0 13px}' +
      'h2{font-size:19px;margin:0 0 10px}.t{border-top:1px solid #eaf1fa;padding:10px 0}.t:first-of-type{border-top:0;padding-top:0}' +
      '.th{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.th h3{margin:0;font-size:15px}.th span{font:12px/1.2 ui-monospace,Consolas,monospace;color:#597084;white-space:nowrap}' +
      '.l{margin:2px 0 4px;color:#597084;font-size:12.5px}ul{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:3px}' +
      'li{font-size:14px;color:#51677b;display:flex;gap:7px;align-items:flex-start}li i{display:inline-grid;place-items:center;width:15px;height:15px;border-radius:50%;border:1px solid #cfe0f2;color:#fff;font-style:normal;font-size:10px;flex:none;margin-top:2px}' +
      'li.d{color:#0b1b2b}li.d i{background:#0f9d6e;border-color:#0f9d6e}' +
      '.ft{color:#7b90a4;font-size:11px;text-align:center;margin-top:16px}' +
      '@media print{body{background:#fff}.w{max-width:none;padding:0}.hd{border-radius:0}section{break-inside:avoid}}' +
      '</style></head><body><div class="w">' +
      '<div class="hd"><small>Global Behring · rapporto di lavoro</small><h1>' + esc(name) + '</h1><p>' + date + ' · ' + esc(m.site) + ' · referente ' + esc(m.referente) + '</p></div>' +
      '<div class="st"><div><b>' + c.done + '/' + c.total + '</b>attività</div><div><b>' + (c.total ? Math.round(c.done / c.total * 100) : 0) + '%</b>completato</div><div><b>' + Object.keys(by).length + '</b>giorni</div></div>' +
      (sections || '<section><p>Nessuna attività segnata.</p></section>') +
      '<div class="ft">Generato dalla guida operativa Global Behring · ' + new Date().toLocaleString('it-IT') + '</div></div></body></html>';
  }

  function fileName(name) {
    var n = String(name || 'dipendente').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
    return 'Rapporto-' + (n || 'dipendente') + '-' + isoy(new Date()) + '.html';
  }

  function save() {
    var name = validName(); if (!name) return '';
    lastHTML = reportHTML(name);
    var blob = new Blob([lastHTML], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fileName(name);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    if (typeof showToast === 'function') showToast('Report scaricato: allegalo al messaggio');
    return lastHTML;
  }

  async function share() {
    var name = validName(); if (!name) return;
    if (!lastHTML) lastHTML = reportHTML(name);
    var file = new File([lastHTML], fileName(name), { type: 'text/html' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ title: 'Rapporto ' + name, text: 'Rapporto di lavoro del ' + new Date().toLocaleDateString('it-IT'), files: [file] }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    save();
  }

  function whatsapp() {
    var name = validName(); if (!name) return;
    var c = collect(), m = meta();
    var lines = ['*Rapporto Global Behring*', name + ' · ' + new Date().toLocaleDateString('it-IT'), m.site, '', c.done + '/' + c.total + ' attività completate (' + (c.total ? Math.round(c.done / c.total * 100) : 0) + '%)', '', 'Ti invio il report completo come file.'];
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  }

  btn.addEventListener('click', open);
  document.getElementById('deliverDownload').addEventListener('click', save);
  document.getElementById('deliverShare').addEventListener('click', share);
  document.getElementById('deliverWhats').addEventListener('click', whatsapp);
  nameInput.addEventListener('input', function () { nameInput.classList.remove('err'); });
})();
