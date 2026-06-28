/* Care Bridge Home — shared Admin behaviours (every page).
   Sidebar protrusion toggle · header + dropdown · global Add Member / Add Enquiry
   drawers · mail & notifications panels · clickable rows · drawer/overlay helpers. */
(function () {
  function icon(n){ return '<span class="icon"><svg><use href="#i-'+n+'"/></svg></span>'; }
  function el(html){ var t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; }

  /* ---------- Sidebar hide/show via edge handle ---------- */
  window.toggleSidebar = function(){
    var app = document.querySelector('.app'); if(!app) return;
    var on = !app.classList.contains('sidebar-collapsed');
    app.classList.toggle('sidebar-collapsed', on);
    try { localStorage.setItem('cbh-sb', on ? '1':'0'); } catch(e){}
  };
  function mountHandle(){
    var app = document.querySelector('.app'); if(!app || app.querySelector('.sb-handle')) return;
    var h = el('<button class="sb-handle" aria-label="Toggle sidebar"><span class="icon"><svg><use href="#i-chevron"/></svg></span></button>');
    h.querySelector('.icon svg').style.transform = 'scaleX(-1)';
    h.addEventListener('click', window.toggleSidebar);
    app.appendChild(h);
  }

  /* ---------- Drawer / overlay ---------- */
  window.openDrawer = function(id){ closePopovers(); var d=document.getElementById(id); if(!d) return; d.classList.add('is-open'); ensureOverlay().classList.add('is-open'); };
  window.closeDrawer = function(){ document.querySelectorAll('.drawer.is-open').forEach(function(d){ d.classList.remove('is-open'); }); var o=document.querySelector('.overlay'); if(o) o.classList.remove('is-open'); };
  function ensureOverlay(){ var o=document.querySelector('.overlay'); if(!o){ o=el('<div class="overlay"></div>'); document.body.appendChild(o); o.addEventListener('click', window.closeDrawer); } return o; }

  /* ---------- Header: + dropdown, mail, notifications ---------- */
  var XBTN = '<button class="x-btn" onclick="closeDrawer()"><span class="icon icon--sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></span></button>';

  var ENQUIRY = '<aside class="drawer" id="addEnquiry"><div class="drawer__head"><span class="drawer__title">New enquiry</span>'+XBTN+'</div>'
    +'<div class="drawer__body">'
    +'<div class="field-grid"><div class="field"><label>Full name <span class="req">*</span></label><div class="control"><input placeholder="e.g. Priya Suresh"></div></div>'
    +'<div class="field"><label>Phone <span class="req">*</span></label><div class="control"><input placeholder="+91 …"></div></div>'
    +'<div class="field"><label>Location (town) <span class="req">*</span></label><div class="control"><input list="g-towns" placeholder="Start typing…"></div><datalist id="g-towns"><option>Ernakulam</option><option>Thrissur</option><option>Kottayam</option><option>Palakkad</option><option>Kozhikode</option><option>Thiruvananthapuram</option></datalist></div>'
    +'<div class="field"><label>Landmark notes</label><div class="control"><input placeholder="Near…"></div></div>'
    +'<div class="field"><label>Lead source</label><select><option>WhatsApp</option><option>Phone</option><option>Website</option><option>Hospital referral</option><option>Community referral</option><option>Walk-in</option></select></div>'
    +'<div class="field"><label>Urgency</label><select><option>Low</option><option selected>Medium</option><option>High</option><option>Urgent</option></select></div></div>'
    +'<div class="field field--full"><label>Service interest</label><div class="checks"><label class="check"><input type="checkbox">Digital Wellness</label><label class="check"><input type="checkbox">Virtual Care</label><label class="check"><input type="checkbox">Direct Care</label><label class="check"><input type="checkbox">Home nursing</label><label class="check"><input type="checkbox">Physiotherapy</label></div></div>'
    +'<div class="field field--full"><label>Conversion probability</label><div class="slider-row"><input type="range" min="0" max="100" value="60" step="5" oninput="this.parentElement.querySelector(\'.val\').value=this.value+\'%\'"><input class="val" value="60%"></div></div>'
    +'<div class="field field--full"><label>Follow-up date</label><div class="control"><input type="date"></div></div>'
    +'<div class="field field--full"><label>Notes</label><textarea placeholder="Context, who referred, care needs…"></textarea></div>'
    +'</div><div class="drawer__foot"><button class="btn btn--outline btn--sm" onclick="closeDrawer()">Cancel</button><button class="btn btn--primary btn--sm" onclick="closeDrawer()">Save enquiry</button></div></aside>';

  var MEMBER = '<aside class="drawer" id="addMember" style="width:520px"><div class="drawer__head"><span class="drawer__title">Add member</span>'+XBTN+'</div>'
    +'<div class="drawer__body">'
    +'<div class="field-grid"><div class="field"><label>Full name <span class="req">*</span></label><div class="control"><input placeholder="e.g. Anu George"></div></div>'
    +'<div class="field"><label>Date of birth</label><div class="control"><input type="date"></div></div>'
    +'<div class="field"><label>Gender</label><select><option>Female</option><option>Male</option><option>Other</option></select></div>'
    +'<div class="field"><label>Phone <span class="req">*</span></label><div class="control"><input placeholder="+91 …"></div></div>'
    +'<div class="field"><label>District</label><select><option>Ernakulam</option><option>Thrissur</option><option>Kottayam</option><option>Palakkad</option><option>Kozhikode</option></select></div>'
    +'<div class="field"><label>Town / landmark</label><div class="control"><input list="g-towns2" placeholder="Start typing…"></div><datalist id="g-towns2"><option>Kakkanad</option><option>Aluva</option><option>Guruvayur</option></datalist></div>'
    +'<div class="field"><label>Care model</label><select><option>Digital Wellness</option><option>Virtual Care</option><option selected>Direct Care</option></select></div>'
    +'<div class="field"><label>Plan level</label><select><option>Basic</option><option selected>Standard</option><option>Premium</option></select></div></div>'
    +'<div class="field field--full"><label>Address</label><textarea placeholder="Full home address…"></textarea></div>'
    +'<div class="field-grid"><div class="field"><label>Family contact</label><div class="control"><input placeholder="Name · phone"></div></div>'
    +'<div class="field"><label>Emergency contact</label><div class="control"><input placeholder="Name · phone"></div></div></div>'
    +'<div class="field field--full"><label>Medical summary</label><textarea placeholder="Conditions, allergies, medication, treating doctor…"></textarea></div>'
    +'</div><div class="drawer__foot"><button class="btn btn--outline btn--sm" onclick="closeDrawer()">Cancel</button><button class="btn btn--primary btn--sm" onclick="closeDrawer()">Add member</button></div></aside>';

  function dropItem(ic,t,s,act){ return '<div class="dropdown__item" onclick="'+act+'"><span class="ic">'+icon(ic)+'</span><span><span class="t">'+t+'</span><br><span class="s">'+s+'</span></span></div>'; }

  function transformHeader(){
    var actions = document.querySelector('.topbar .topbar__actions'); if(!actions) return;
    /* + dropdown replacing the old Add Enquiry button */
    var addBtn = actions.querySelector('.btn--primary');
    if(addBtn && !actions.querySelector('.add-menu')){
      var menu = el('<div class="add-menu"><button class="add-btn" aria-label="Add new">'+icon('plus')+'</button>'
        +'<div class="dropdown">'+dropItem('members','Add new member','Enrol a member into a care model',"openDrawer('addMember')")
        + dropItem('inbox','Add new enquiry','Log a lead or enquiry',"openDrawer('addEnquiry')")+'</div></div>');
      addBtn.replaceWith(menu);
      menu.querySelector('.add-btn').addEventListener('click', function(e){ e.stopPropagation(); var d=menu.querySelector('.dropdown'); var open=d.classList.contains('is-open'); closePopovers(); if(!open) d.classList.add('is-open'); });
    }
    /* mail + notification panels */
    wrapPanel(actions.querySelector('.icon-btn[aria-label=Messages]'), 'Messages', MAIL_ITEMS, 'mail.html');
    wrapPanel(actions.querySelector('.icon-btn[aria-label=Notifications]'), 'Notifications', NOTIF_ITEMS, '#');
  }
  function wrapPanel(btn, title, itemsHTML, allHref){
    if(!btn || btn.closest('.hd-wrap')) return;
    var wrap = el('<div class="hd-wrap"></div>'); btn.replaceWith(wrap); wrap.appendChild(btn);
    var panel = el('<div class="hd-panel"><div class="hd-panel__head"><span class="t">'+title+'</span><a href="#">Mark all read</a></div>'+itemsHTML+'<div class="hd-panel__foot"><a href="'+allHref+'">View all</a></div></div>');
    wrap.appendChild(panel);
    btn.addEventListener('click', function(e){ e.stopPropagation(); var open=panel.classList.contains('is-open'); closePopovers(); if(!open) panel.classList.add('is-open'); });
  }
  function hdItem(ic,col,t,s,time){ return '<div class="hd-item"><span class="ic" style="background:var(--'+col+'-soft);color:var(--'+col+'-text)"><span class="icon"><svg><use href="#i-'+ic+'"/></svg></span></span><span class="body"><span class="t">'+t+'</span><span class="s">'+s+'</span></span><span class="time">'+time+'</span></div>'; }
  var MAIL_ITEMS = ''
    + hdItem('mail','info','Arun Kumar (family)','Re: Mother’s glucose reading','2m')
    + hdItem('mail','info','Dr. Nair','Discharge summary attached','1h')
    + hdItem('mail','info','Riya Francis (finance)','Invoice CBH-INV-0050 overdue','3h');
  var NOTIF_ITEMS = ''
    + hdItem('emergency','danger','SOS — Kumari Lakshmi N.','Fall · Kakkanad · respond now','4m')
    + hdItem('clipboard','warning','3 assessments overdue','Action required','1h')
    + hdItem('document','accent','Visit report submitted','Gopal Nair · awaiting review','2h')
    + hdItem('payments','warning','4 staff payments pending','₹31,500 to approve','5h');

  function closePopovers(){ document.querySelectorAll('.dropdown.is-open,.hd-panel.is-open').forEach(function(p){ p.classList.remove('is-open'); }); }

  /* ---------- Clickable rows + filters ---------- */
  function wireRows(){
    document.addEventListener('click', function(e){
      if(e.target.closest('button, a, input, select, .x-btn, .add-menu, .hd-wrap')) return;
      var link = e.target.closest('[data-href]'); if(link) window.location.href = link.getAttribute('data-href');
    });
  }
  function wireFilters(){ document.querySelectorAll('.filter').forEach(function(f){ f.addEventListener('click', function(){ f.classList.toggle('filter--active'); }); }); }

  function init(){
    var app=document.querySelector('.app');
    try { if(localStorage.getItem('cbh-sb')==='1' && app) app.classList.add('sidebar-collapsed'); } catch(e){}
    mountHandle();
    if(!document.getElementById('addEnquiry')) document.body.appendChild(el(ENQUIRY));
    if(!document.getElementById('addMember'))  document.body.appendChild(el(MEMBER));
    ensureOverlay();
    transformHeader(); wireRows(); wireFilters();
    document.querySelectorAll('.topbar__search input').forEach(function(input){ input.setAttribute('aria-label','Search Care Bridge'); });
    document.querySelectorAll('button').forEach(function(btn){ if(!btn.getAttribute('type')) btn.setAttribute('type','button'); });
    document.addEventListener('click', closePopovers);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ window.closeDrawer(); closePopovers(); } });
    document.querySelectorAll('.check input').forEach(function(c){ c.addEventListener('change', function(){ c.closest('.check').classList.toggle('is-on', c.checked); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
