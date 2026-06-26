/* Care Bridge Home — mobile app shell (router + interactions).
   One instance per app file (nurse-app / family-app). Views are <section class="view" id> .
   Nav: data-nav="tabs" shows bottom nav, data-tab matches a .bnav__i. Else it's a push view. */
(function () {
  var stack = [];
  function screen(){ return document.querySelector('.screen'); }
  function views(){ return Array.prototype.slice.call(document.querySelectorAll('.view')); }
  function byId(id){ return document.getElementById(id); }

  function setNav(view){
    var bnav = document.querySelector('.bnav'); if (!bnav) return;
    var tabs = view && view.getAttribute('data-nav') === 'tabs';
    bnav.style.display = tabs ? 'flex' : 'none';
    if (tabs){
      var tab = view.getAttribute('data-tab');
      bnav.querySelectorAll('.bnav__i').forEach(function(i){
        i.classList.toggle('is-active', i.getAttribute('data-tab') === tab);
      });
    }
  }

  function go(id, opts){
    opts = opts || {};
    var target = byId(id); if (!target) return;
    var cur = document.querySelector('.view.is-active');
    if (cur === target){ return; }
    if (cur && !opts.replace && !opts.back){ stack.push(cur.id); }
    if (opts.reset){ stack = []; }
    if (cur){ cur.classList.remove('is-active'); }
    target.classList.add('is-active');
    var b = target.querySelector('.vbody'); if (b) b.scrollTop = 0;
    setNav(target);
    if (opts.onShow) opts.onShow(target);
  }
  function back(){ var prev = stack.pop(); if (prev) go(prev, { back:true }); }

  /* ---- Segmented control ---- */
  function seg(btn){
    var grp = btn.parentNode; grp.querySelectorAll('button').forEach(function(b){ b.classList.remove('is-active'); });
    btn.classList.add('is-active');
    var panelName = btn.getAttribute('data-panel');
    if (panelName){
      var wrap = btn.closest('[data-segwrap]') || document;
      wrap.querySelectorAll('[data-segpanel]').forEach(function(p){ p.style.display = (p.getAttribute('data-segpanel') === panelName) ? '' : 'none'; });
    }
  }

  /* ---- Choice chips ---- */
  function choice(el){
    var single = el.parentNode.getAttribute('data-single') !== 'false';
    if (single){ el.parentNode.querySelectorAll('.choice').forEach(function(c){ c.classList.remove('on','on-warn','on-alert'); }); }
    var tone = el.getAttribute('data-tone');
    el.classList.toggle('on'+(tone? '-'+tone : ''), true);
  }

  /* ---- Switch ---- */
  function sw(el){ el.classList.toggle('on'); }

  /* ---- Accordion report ---- */
  function acc(head){
    var item = head.closest('.acc');
    var open = item.classList.contains('active');
    item.parentNode.querySelectorAll('.acc').forEach(function(a){ a.classList.remove('active'); });
    if (!open) item.classList.add('active');
  }
  function saveAcc(btn){
    var item = btn.closest('.acc');
    item.classList.add('done'); item.classList.remove('active');
    updateReport(item.closest('.report'));
    var sibs = Array.prototype.slice.call(item.parentNode.querySelectorAll('.acc'));
    var next = sibs[sibs.indexOf(item)+1];
    if (next && !next.classList.contains('done')){ next.classList.add('active'); var b=next.querySelector('.acc__b'); }
    toast('Section saved', 'ok');
  }
  function updateReport(rep){
    if (!rep) return;
    var all = rep.querySelectorAll('.acc'), done = rep.querySelectorAll('.acc.done');
    var pct = Math.round(done.length / all.length * 100);
    var bar = rep.querySelector('.pbar > span'); if (bar) bar.style.width = pct + '%';
    var pl = rep.querySelector('[data-pct]'); if (pl) pl.textContent = done.length + ' of ' + all.length;
    var sub = byId('submitReport'); if (sub){ sub.disabled = done.length < all.length; }
  }

  /* ---- Toast ---- */
  function toast(msg, type){
    var wrap = document.querySelector('.toast-wrap'); if (!wrap){ wrap = document.createElement('div'); wrap.className='toast-wrap'; screen().appendChild(wrap); }
    var ic = { ok:'check', warn:'emergency', alert:'emergency', info:'bell' }[type] || 'check';
    var t = document.createElement('div'); t.className = 'toast toast--' + (type||'ok');
    t.innerHTML = '<span class="icon"><svg><use href="#i-'+ic+'"/></svg></span>' + msg;
    wrap.appendChild(t); requestAnimationFrame(function(){ t.classList.add('show'); });
    setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 320); }, 2600);
  }

  /* ---- Bottom sheet ---- */
  function ensureScrim(){ var s = document.querySelector('.scrim'); if (!s){ s = document.createElement('div'); s.className='scrim'; s.addEventListener('click', closeSheet); screen().appendChild(s); } return s; }
  function openSheet(id){ var sh = byId(id); if (!sh) return; ensureScrim().classList.add('show'); sh.classList.add('show'); }
  function closeSheet(){ document.querySelectorAll('.sheet.show').forEach(function(s){ s.classList.remove('show'); }); var sc=document.querySelector('.scrim'); if (sc) sc.classList.remove('show'); }

  /* ---- GPS check-in simulation (nurse) ---- */
  function startGps(){
    var v = byId('gpsView'); if (!v) return;
    var box = v.querySelector('.gps'); var title = v.querySelector('[data-gps-title]'); var sub = v.querySelector('[data-gps-sub]');
    var statusV = v.querySelector('[data-gps-status]'); var distV = v.querySelector('[data-gps-dist]'); var cta = v.querySelector('[data-gps-cta]');
    box.className = 'gps'; title.textContent = 'Detecting your location…'; sub.textContent = 'Hold on while we confirm you’re at the visit address.';
    if (statusV) statusV.innerHTML = '<span class="icon" style="color:var(--warning)"><svg><use href="#i-gps"/></svg></span>Searching';
    if (distV) distV.textContent = '—';
    cta.disabled = true; cta.textContent = 'Verifying…';
    setTimeout(function(){
      if (distV) distV.textContent = '38 m away';
      box.classList.add('ok'); title.textContent = 'Location verified'; sub.textContent = 'You’re at Mary Varghese’s home. Check-in is ready.';
      if (statusV) statusV.innerHTML = '<span class="icon" style="color:var(--accent-text)"><svg><use href="#i-check"/></svg></span>Verified';
      cta.disabled = false; cta.textContent = 'Confirm check-in';
      cta.onclick = function(){ checkinDone(); };
    }, 2200);
  }
  function checkinDone(){
    toast('Checked in · 10:32 AM', 'ok');
    var t = byId('checkinTime'); if (t) t.textContent = '10:32 AM';
    startTimer();
    go('activeView');
  }
  var timerInt;
  function startTimer(){
    var el = byId('visitClock'); if (!el) return; var s = 0; clearInterval(timerInt);
    timerInt = setInterval(function(){ s++; var m = Math.floor(s/60), ss = s%60; el.textContent = String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0'); }, 1000);
  }

  /* ---- Report submit / checkout (nurse) ---- */
  function submitReport(){ toast('Report submitted to coordinator', 'ok'); go('checkoutView'); }
  function completeVisit(){ clearInterval(timerInt); go('doneView'); }

  /* ---- SOS flow (family) ---- */
  var sosTimers = [];
  function triggerSos(){
    closeSheet(); go('sosActiveView');
    var steps = ['sosStep1','sosStep2','sosStep3','sosStep4'];
    steps.forEach(function(id,i){
      sosTimers.push(setTimeout(function(){
        var el = byId(id); if (!el) return; el.classList.remove('pending'); el.classList.add(i===steps.length-1?'active':'done');
        var prev = byId(steps[i-1]); if (prev){ prev.classList.remove('active'); prev.classList.add('done'); }
        toast(el.querySelector('.tt').textContent, 'ok');
      }, 1400*(i+1)));
    });
  }
  function resolveSos(){
    sosTimers.forEach(clearTimeout); sosTimers = [];
    ['sosStep1','sosStep2','sosStep3','sosStep4'].forEach(function(id){ var e=byId(id); if(e){ e.classList.remove('pending','active'); e.classList.add('done'); } });
    go('sosDoneView');
  }

  /* ---- Init ---- */
  function init(){
    var first = document.querySelector('.view.is-active') || document.querySelector('.view');
    if (first){ first.classList.add('is-active'); setNav(first); }
    document.querySelectorAll('.bnav__i[data-go]').forEach(function(i){ i.addEventListener('click', function(){ go(i.getAttribute('data-go')); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.CBH = { go:go, back:back, seg:seg, choice:choice, sw:sw, acc:acc, saveAcc:saveAcc, toast:toast,
    openSheet:openSheet, closeSheet:closeSheet, startGps:startGps, submitReport:submitReport, completeVisit:completeVisit,
    triggerSos:triggerSos, resolveSos:resolveSos, startTimer:startTimer };
})();
