/* Care Bridge Home — outlined icon sprite (single source for all screens).
   Injects a hidden <svg> with <symbol> defs. Use: <svg class="icon"><use href="#i-NAME"/></svg> */
(function () {
  var S = {
    dashboard:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
    emergency:'<path d="M12 4.3 21 19.6H3z"/><line x1="12" y1="10" x2="12" y2="14.3"/><line x1="12" y1="16.8" x2="12" y2="16.9"/>',
    inbox:'<path d="M3.5 13 6 5.5h12L20.5 13"/><path d="M3.5 13v5.5h17V13h-4.4a3.1 3.1 0 0 1-6.2 0z"/>',
    members:'<circle cx="8" cy="8.5" r="2.8"/><circle cx="16" cy="8.5" r="2.8"/><path d="M3 18.5c0-2.6 2.2-4.5 5-4.5 1.2 0 2.3 .35 3.1 .95"/><path d="M21 18.5c0-2.6-2.2-4.5-5-4.5-1.2 0-2.3 .35-3.1 .95"/>',
    clipboard:'<rect x="5" y="4.5" width="14" height="16" rx="2.2"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/><line x1="8.5" y1="11.5" x2="15.5" y2="11.5"/><line x1="8.5" y1="15" x2="13.5" y2="15"/>',
    models:'<path d="M12 3.5 21 8l-9 4.5L3 8z"/><path d="M3.5 12 12 16.3 20.5 12"/><path d="M3.5 16 12 20.3 20.5 16"/>',
    catalogue:'<path d="M4 11.6 11.6 4H20v8.4l-7.6 7.6a1.6 1.6 0 0 1-2.3 0L4 13.9a1.6 1.6 0 0 1 0-2.3z"/><circle cx="15.4" cy="8.6" r="1.5"/>',
    scheduler:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/>',
    duties:'<path d="M3.5 7 5 8.5 7.5 6"/><path d="M3.5 12.5 5 14 7.5 11.5"/><path d="M3.5 18 5 19.5 7.5 17"/><line x1="11" y1="7.2" x2="20.5" y2="7.2"/><line x1="11" y1="12.7" x2="20.5" y2="12.7"/><line x1="11" y1="18.2" x2="20.5" y2="18.2"/>',
    document:'<path d="M6.5 3.5h7.5l4 4v13H6.5z"/><path d="M13.5 3.5v4.2h4.2"/><line x1="9.5" y1="13" x2="15" y2="13"/><line x1="9.5" y1="16.5" x2="15" y2="16.5"/>',
    pin:'<path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.4"/>',
    hr:'<rect x="4.5" y="3.5" width="15" height="17" rx="2.4"/><circle cx="12" cy="10" r="2.6"/><path d="M8 17.6c0-2.1 1.8-3.5 4-3.5s4 1.4 4 3.5"/>',
    gps:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><line x1="12" y1="2.5" x2="12" y2="5.2"/><line x1="12" y1="18.8" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.2" y2="12"/><line x1="18.8" y1="12" x2="21.5" y2="12"/>',
    billing:'<path d="M6 3.5h12v17l-2.5-1.7L13 20.5l-2.5-1.7L8 20.5 6 19z"/><line x1="9" y1="8.5" x2="15" y2="8.5"/><line x1="9" y1="12" x2="15" y2="12"/>',
    payments:'<rect x="3.5" y="6" width="17" height="13" rx="2.4"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="14" y1="14.5" x2="17" y2="14.5"/>',
    reports:'<line x1="4" y1="20" x2="20.5" y2="20"/><rect x="5.5" y="11" width="3.2" height="6.5" rx="0.8"/><rect x="10.4" y="6.5" width="3.2" height="11" rx="0.8"/><rect x="15.3" y="13" width="3.2" height="4.5" rx="0.8"/>',
    pulse:'<path d="M3 12.5h3.5l2-5.5 3.5 11 2.2-7 1.6 3.5H21"/>',
    shield:'<path d="M12 3.5 19 6v5c0 4.6-3 8-7 9.5-4-1.5-7-4.9-7-9.5V6z"/><path d="M9 11.8l2.1 2.1 3.9-4"/>',
    cog:'<circle cx="12" cy="12" r="3.2"/><path d="M12 3.3v2.5"/><path d="M12 18.2v2.5"/><path d="M3.3 12h2.5"/><path d="M18.2 12h2.5"/><path d="M5.8 5.8 7.6 7.6"/><path d="M16.4 16.4l1.8 1.8"/><path d="M18.2 5.8 16.4 7.6"/><path d="M7.6 16.4 5.8 18.2"/>',
    help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.4 2.4 0 0 1 4.5 1.1c0 1.6-2 1.9-2 3.3"/><line x1="12" y1="17" x2="12" y2="17.1"/>',
    settings:'<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.1"/><circle cx="15" cy="12" r="2.1"/><circle cx="8" cy="17" r="2.1"/>',
    logout:'<path d="M14 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H14"/><line x1="10.5" y1="12" x2="21" y2="12"/><path d="M17.5 8.5 21 12l-3.5 3.5"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><line x1="15.8" y1="15.8" x2="20.5" y2="20.5"/>',
    bell:'<path d="M6.5 17h11l-1.4-2.3V11a4.1 4.1 0 0 0-8.2 0v3.7L6.5 17z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="2.2"/><path d="M4.5 7.5 12 12.7 19.5 7.5"/>',
    chevron:'<polyline points="9,6 15,12 9,18"/>',
    'chevron-down':'<polyline points="6,9 12,15 18,9"/>',
    plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trending:'<polyline points="4,15.5 10,9.5 13,12.5 20,5.5"/><polyline points="15,5.5 20,5.5 20,10.5"/>',
    more:'<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    swap:'<polyline points="7,4 4,7 7,10"/><line x1="4" y1="7" x2="20" y2="7"/><polyline points="17,14 20,17 17,20"/><line x1="20" y1="17" x2="4" y2="17"/>',
    check:'<polyline points="5,12.5 10,17.5 19,7"/>',
    phone:'<path d="M6 3.5h4l1.5 4-2 1.6a11 11 0 0 0 5.4 5.4l1.6-2 4 1.5v4a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4 6.7 2 2 0 0 1 6 3.5z"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><polyline points="12,7 12,12 15.5,14"/>',
    user:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6"/>',
    heart:'<path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20z"/>',
    star:'<path d="M12 4 14.6 9.3 20.5 10.2 16.2 14.3 17.3 20.2 12 17.4 6.7 20.2 7.8 14.3 3.5 10.2 9.4 9.3z"/>',
    pill:'<rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(45 12 12)"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>',
    camera:'<path d="M4 8h3l1.5-2.2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
    map:'<path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/>',
    'arrow-up':'<line x1="12" y1="19" x2="12" y2="5"/><polyline points="6,11 12,5 18,11"/>',
    'arrow-down':'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="6,13 12,19 18,13"/>'
  };
  var fill = { more:1 };
  var defs = '';
  for (var k in S) {
    defs += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + S[k] + '</symbol>';
  }
  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + defs + '</svg>';
  if (document.body) {
    document.body.insertBefore(wrap, document.body.firstChild);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.insertBefore(wrap, document.body.firstChild);
    });
  }
})();
