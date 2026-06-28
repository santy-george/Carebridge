/* Care Bridge Home — Admin sidebar (single source, rendered into #sidebar).
   Flat groups (no collapsible submenus). Whole-sidebar hide/show lives in app.js.
   Set active item with: <aside class="sidebar" id="sidebar" data-active="ID"></aside> */
(function () {
  var GROUPS = [
    { name: 'Overview', items: [
      { id:'dashboard', label:'Dashboard',        icon:'dashboard', href:'admin-dashboard.html' },
      { id:'emergency', label:'Emergency Centre',  icon:'emergency', href:'emergency-centre.html', badge:'2', alert:true }
    ]},
    { name: 'Membership & Care', items: [
      { id:'leads',       label:'Leads & Enquiries', icon:'inbox',     href:'leads.html', badge:'5' },
      { id:'members',     label:'Members',           icon:'members',   href:'members.html' },
      { id:'assessments', label:'Assessments',       icon:'clipboard', href:'assessments.html' },
      { id:'care-models', label:'Care Models',       icon:'models',    href:'care-models.html' },
      { id:'catalogue',   label:'Service Catalogue', icon:'catalogue', href:'service-catalogue.html' }
    ]},
    { name: 'Operations', items: [
      { id:'scheduler',     label:'Scheduler',       icon:'scheduler', href:'scheduler.html' },
      { id:'visits',        label:'Visits & Duties', icon:'duties',    href:'visits.html' },
      { id:'reports-visit', label:'Visit Reports',   icon:'document',  href:'visit-reports.html', badge:'3' },
      { id:'allocation',    label:'Area Allocation', icon:'pin',       href:'area-allocation.html' }
    ]},
    { name: 'Workforce', items: [
      { id:'hr',         label:'Human Resources',  icon:'hr',  href:'human-resources.html' },
      { id:'attendance', label:'Attendance & GPS', icon:'gps', href:'attendance.html' }
    ]},
    { name: 'Finance', items: [
      { id:'billing',  label:'Billing & Invoices', icon:'billing',  href:'billing.html', badge:'2' },
      { id:'payments', label:'Staff Payments',     icon:'payments', href:'staff-payments.html', badge:'4' }
    ]},
    { name: 'Insights', items: [
      { id:'analytics', label:'Reports & Analytics', icon:'reports', href:'reports-analytics.html' },
      { id:'health',    label:'Health Analytics',    icon:'pulse',   href:'health-analytics.html' }
    ]},
    { name: 'Admin', items: [
      { id:'users',    label:'Users & Roles', icon:'shield', href:'users-roles.html' },
      { id:'settings', label:'Settings',      icon:'cog',    href:'settings.html' }
    ]}
  ];

  function icon(name){ return '<span class="icon"><svg><use href="#i-'+name+'"/></svg></span>'; }

  function item(it, active){
    var cls = 'nav-item' + (it.id === active ? ' is-active' : '');
    var badge = it.badge ? '<span class="nav-badge'+(it.alert?' nav-badge--alert':'')+'">'+it.badge+'</span>' : '';
    return '<a class="'+cls+'" href="'+(it.href||'#'+it.id)+'">'+icon(it.icon)+'<span class="nav-item__label">'+it.label+'</span>'+badge+'</a>';
  }

  function render(el){
    var active = el.getAttribute('data-active') || 'dashboard';
    var html = '<div class="sidebar__logo"><a href="admin-dashboard.html"><img src="assets/cbh-logo.svg" alt="Care Bridge Home"></a></div>';
    html += '<nav class="sidebar__nav">';
    GROUPS.forEach(function(g){
      html += '<div class="nav-tag">'+g.name+'</div>';
      g.items.forEach(function(it){ html += item(it, active); });
    });
    html += '</nav>';
    html += '<div class="sidebar__foot">'
      + '<a class="user-card" href="user-profile.html"><span class="avatar avatar--sm" style="background:var(--purple-300);color:#fff">JA</span>'
      + '<span class="user-card__txt"><span class="name">Joel Abraham</span><span class="role">Care Coordinator</span></span>'
      + '<span class="icon icon--sm"><svg><use href="#i-chevron-down"/></svg></span></a>'
      + '<a class="nav-item nav-item--foot" href="help.html">'+icon('help')+'<span class="nav-item__label">Help &amp; Support</span></a>'
      + '<a class="nav-item nav-item--foot" href="#logout">'+icon('logout')+'<span class="nav-item__label">Log out</span></a>'
      + '</div>';
    el.innerHTML = html;
  }

  function init(){ var el = document.getElementById('sidebar'); if (el) render(el); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
