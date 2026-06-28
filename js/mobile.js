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

  /* ---- Daily check-in (family) ---- */
  var checkinAnswers = {};
  var checkinQuestions = 5;
  function checkinAnswer(questionId, answer){
    checkinAnswers[questionId] = answer;
    var answered = 0;
    var keys = Object.keys(checkinAnswers);
    answered = keys.length;
    var preview = byId('checkinPreview');
    if (preview){
      var pct = Math.round(answered / checkinQuestions * 100);
      preview.textContent = pct + '%';
    }
    toast('Answer saved', 'ok');
  }
  function checkinComplete(){
    var keys = Object.keys(checkinAnswers);
    var score = Math.round(keys.length / checkinQuestions * 100);
    var scoreEl = byId('wellnessScore');
    if (scoreEl) scoreEl.textContent = score;
    go('checkinScoreView');
    toast('Check-in complete · Score ' + score, 'ok');
  }

  /* ---- Wellness plan & challenges (family) ---- */
  function togglePlanItem(el){
    el.classList.toggle('done');
    var done = el.classList.contains('done');
    toast(done ? 'Plan item marked done' : 'Plan item reopened', 'ok');
  }
  function toggleChallenge(el){
    var joined = el.classList.toggle('joined');
    el.textContent = joined ? 'Leave challenge' : 'Join challenge';
    toast(joined ? 'Challenge joined' : 'Challenge left', 'ok');
  }

  /* ---- Chat (family) ---- */
  function sendChat(inputId, listId){
    var input = byId(inputId); if (!input) return;
    var list = byId(listId); if (!list) return;
    var text = input.value.trim(); if (!text) return;
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--out';
    bubble.textContent = text;
    list.appendChild(bubble);
    input.value = '';
    list.scrollTop = list.scrollHeight;
    setTimeout(function(){
      var reply = document.createElement('div');
      reply.className = 'chat-bubble chat-bubble--in';
      reply.textContent = 'Thanks for your message. Our care team will get back to you shortly.';
      list.appendChild(reply);
      list.scrollTop = list.scrollHeight;
    }, 1500);
  }

  /* ---- Language toggle (family) ---- */
  function toggleLang(){
    var s = screen(); if (!s) return;
    var cur = s.getAttribute('data-lang') || 'en';
    var next = cur === 'en' ? 'ml' : 'en';
    s.setAttribute('data-lang', next);
    toast(next === 'ml' ? 'മലയാളം തിരഞ്ഞെടുത്തു' : 'Language switched to English', 'ok');
  }

  /* ---- Voice message (family) ---- */
  function startVoice(btnId){
    var btn = byId(btnId); if (!btn) return;
    var orig = btn.textContent;
    btn.classList.add('recording');
    btn.textContent = 'Recording…';
    btn.disabled = true;
    setTimeout(function(){
      btn.classList.remove('recording');
      btn.textContent = orig;
      btn.disabled = false;
      toast('Voice message sent', 'ok');
    }, 3000);
  }

  /* ---- Document upload (family) ---- */
  function uploadDoc(){
    toast('Uploading document…', 'info');
    setTimeout(function(){
      var list = byId('docList') || document.querySelector('.doc-list');
      if (list){
        var card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = '<span class="icon"><svg><use href="#i-doc"/></svg></span><div class="doc-card__body"><div class="doc-card__name">Uploaded document</div><div class="doc-card__meta">Just now</div></div>';
        list.appendChild(card);
      }
      toast('Document uploaded', 'ok');
    }, 1500);
  }

  /* ---- Concern & service request (family) ---- */
  function submitConcern(){
    toast('Concern reported to care team', 'ok');
    back();
  }
  function requestService(serviceName){
    toast('Service request sent: ' + serviceName, 'ok');
    back();
  }

  /* ---- Care tier navigation (family) ---- */
  var tierNames = { 1:'Digital Wellness', 2:'Virtual Care', 3:'Direct Care' };
  function goTier(tier){
    var s = screen(); if (s) s.setAttribute('data-tier', tier);
    var viewId = (tier === 'tier3' || tier === '3') ? 'homeView' : 'tier' + tier + 'Home';
    go(viewId, {reset:true});
  }
  function upgradeTier(targetTier){
    var name = tierNames[targetTier] || ('Tier ' + targetTier);
    toast('Upgrading to ' + name + '…', 'info');
    setTimeout(function(){ goTier(targetTier); }, 1000);
  }

  /* ---- Family members & consent (family) ---- */
  function addFamilyMember(){
    toast('Family member invite sent', 'ok');
    back();
  }
  function toggleConsent(el){
    el.classList.toggle('on');
    var on = el.classList.contains('on');
    toast(on ? 'Consent granted' : 'Consent withdrawn', 'ok');
  }

  /* ---- Care request form (family) ---- */
  function crformNext(currentStep, nextStep){
    var cur = byId(currentStep); if (cur) cur.style.display = 'none';
    var nxt = byId(nextStep); if (nxt) nxt.style.display = '';
    var prog = byId('crformProgress');
    if (prog){
      var steps = prog.querySelectorAll('.crform-step');
      steps.forEach(function(s, i){
        var stepView = byId('crformStep' + (i + 1));
        s.classList.toggle('active', stepView && stepView.id === nextStep);
      });
    }
    go(nextStep);
  }
  function crformBack(currentStep, prevStep){
    var cur = byId(currentStep); if (cur) cur.style.display = 'none';
    var prv = byId(prevStep); if (prv) prv.style.display = '';
    var prog = byId('crformProgress');
    if (prog){
      var steps = prog.querySelectorAll('.crform-step');
      steps.forEach(function(s, i){
        var stepView = byId('crformStep' + (i + 1));
        s.classList.toggle('active', stepView && stepView.id === prevStep);
      });
    }
    go(prevStep);
  }
  function crformSubmit(){
    toast('Care request submitted', 'ok');
    go('home');
  }

  /* ---- Medication adherence (family) ---- */
  function toggleMed(el){
    el.classList.toggle('taken');
    var taken = el.classList.contains('taken');
    toast(taken ? 'Medicine marked as taken' : 'Medicine marked as untaken', 'ok');
    var list = el.closest('.med-list') || document;
    var all = list.querySelectorAll('.med-item');
    var done = list.querySelectorAll('.med-item.taken');
    var pct = all.length ? Math.round(done.length / all.length * 100) : 0;
    var adherence = byId('medAdherence');
    if (adherence) adherence.textContent = pct + '%';
  }

  /* ---- Monthly report (family) ---- */
  function generateReport(){
    toast('Monthly report generating…', 'info');
    setTimeout(function(){ toast('Report ready', 'ok'); }, 2000);
  }

  /* ---- Home safety check (family) ---- */
  function toggleSafety(el){
    if (el.classList.contains('ok')){
      el.classList.remove('ok'); el.classList.add('warn');
    } else if (el.classList.contains('warn')){
      el.classList.remove('warn'); el.classList.add('alert');
    } else if (el.classList.contains('alert')){
      el.classList.remove('alert'); el.classList.add('ok');
    } else {
      el.classList.add('ok');
    }
    var status = el.classList.contains('ok') ? 'OK' : el.classList.contains('warn') ? 'Warning' : 'Alert';
    toast('Safety check: ' + status, 'ok');
  }

  window.CBH = { go:go, back:back, seg:seg, choice:choice, sw:sw, acc:acc, saveAcc:saveAcc, toast:toast,
    openSheet:openSheet, closeSheet:closeSheet, startGps:startGps, submitReport:submitReport, completeVisit:completeVisit,
    triggerSos:triggerSos, resolveSos:resolveSos, startTimer:startTimer,
    checkinAnswer:checkinAnswer, checkinComplete:checkinComplete, togglePlanItem:togglePlanItem,
    toggleChallenge:toggleChallenge, sendChat:sendChat, toggleLang:toggleLang, startVoice:startVoice,
    uploadDoc:uploadDoc, submitConcern:submitConcern, requestService:requestService, goTier:goTier,
    upgradeTier:upgradeTier, addFamilyMember:addFamilyMember, toggleConsent:toggleConsent,
    crformNext:crformNext, crformBack:crformBack, crformSubmit:crformSubmit, toggleMed:toggleMed,
    generateReport:generateReport, toggleSafety:toggleSafety };
})();
