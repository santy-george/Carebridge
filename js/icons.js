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
    library:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
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
    'heart-pulse':'<path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20z"/><polyline points="7.2,11.2 9.4,11.2 10.4,9 11.6,13.2 12.6,11.2 16.8,11.2"/>',
    star:'<path d="M12 4 14.6 9.3 20.5 10.2 16.2 14.3 17.3 20.2 12 17.4 6.7 20.2 7.8 14.3 3.5 10.2 9.4 9.3z"/>',
    pill:'<rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(45 12 12)"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>',
    camera:'<path d="M4 8h3l1.5-2.2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
    map:'<path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/>',
    'arrow-up':'<line x1="12" y1="19" x2="12" y2="5"/><polyline points="6,11 12,5 18,11"/>',
    'arrow-down':'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="6,13 12,19 18,13"/>',
    education:'<path d="M3 6 12 4l9 2-9 2z"/><path d="M7 9.5V15c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V9.5"/><line x1="21" y1="6" x2="21" y2="10"/>',
    trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3"/><path d="M16 5h3v2a3 3 0 0 1-3 3"/><line x1="12" y1="13" x2="12" y2="17"/><rect x="8.5" y="17" width="7" height="3" rx="1"/>',
    wallet:'<rect x="3.5" y="6" width="17" height="13" rx="2.4"/><path d="M3.5 10h17"/><circle cx="16.5" cy="14.5" r="1.3"/>',
    chat:'<path d="M4 5.5h16v10H8l-4 3.5z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="12" x2="13" y2="12"/>',
    video:'<rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 11l6-3v8l-6-3"/>',
    lab:'<path d="M9 3v6L5 18a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-9V3"/><line x1="8" y1="3" x2="16" y2="3"/><line x1="7" y1="15" x2="17" y2="15"/>',
    therapy:'<path d="M4 8c0-2 2-4 5-4s5 2 5 4"/><path d="M14 8c0-2 2-4 5-4"/><path d="M4 8v6c0 3.3 2.2 6 5 6s5-2.7 5-6"/><path d="M14 8v6c0 3.3 2.2 6 5 6"/>',
    caregiver:'<circle cx="12" cy="6" r="2.5"/><path d="M5 20c0-3.4 3-6 7-6s7 2.6 7 6"/><path d="M9 11l-2 2"/><path d="M15 11l2 2"/>',
    'home-safety':'<path d="M4 10 12 4l8 6v9H4z"/><rect x="9.5" y="13" width="5" height="6"/><line x1="12" y1="13" x2="12" y2="19"/>',
    home:'<path d="M4 10.5 12 4l8 6.5"/><path d="M5.5 10.5V20h13v-9.5"/><rect x="9.5" y="13" width="5" height="7"/>',
    language:'<path d="M4 5h10"/><path d="M9 5v14"/><path d="M5 9h7"/><path d="M12 14l4 5 4-5"/><path d="M14 14h4"/>',
    mic:'<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><line x1="12" y1="17" x2="12" y2="20"/>',
    target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    route:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v5a4 4 0 0 0 4 4h4"/>',
    family:'<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><path d="M3 19c0-3 2.2-5 5-5s5 2 5 5"/><path d="M11 19c0-3 2.2-5 5-5s5 2 5 5"/>',
    award:'<circle cx="12" cy="9" r="5"/><path d="M9 13.5 7 21l5-2.5L17 21l-2-7.5"/>',
    stethoscope:'<path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M6 4H4v2"/><path d="M14 4h2v2"/><path d="M10 13v3a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-2"/><circle cx="18" cy="14" r="2"/>',
    activity:'<polyline points="3,12 7,12 9,7 13,17 15,12 21,12"/>',
    moon:'<path d="M19 12a7 7 0 0 1-9.5 9.5 7 7 0 0 0 9.5-9.5z"/>',
    food:'<path d="M5 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M7 3v8"/><path d="M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v8"/>',
    brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.5A3 3 0 0 0 9 17V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.5A3 3 0 0 1 15 17V4z"/><line x1="12" y1="4" x2="12" y2="20"/>',
    walking:'<circle cx="12" cy="4.5" r="1.8"/><path d="M12 7v5l-2 7"/><path d="M12 12l3 3"/><path d="M10 10l-3 2"/>',
    upload:'<path d="M12 16V5"/><polyline points="7,10 12,5 17,10"/><path d="M5 19h14"/>',
    eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>',
    alert:'<path d="M12 3 2 20h20z"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.1"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    hands:'<path d="M12 2a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M5 14c0 3.9 3.1 7 7 7s7-3.1 7-7"/>',
    sun:'<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5.3"/><line x1="12" y1="18.7" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.3" y2="12"/><line x1="18.7" y1="12" x2="21.5" y2="12"/><line x1="5.1" y1="5.1" x2="7.1" y2="7.1"/><line x1="16.9" y1="16.9" x2="18.9" y2="18.9"/><line x1="18.9" y1="5.1" x2="16.9" y2="7.1"/><line x1="7.1" y1="16.9" x2="5.1" y2="18.9"/>',
    thyroid:'<path d="M12 8.5c-1-2.2-3-3.5-5-3.5-2.6 0-4.5 2-4.5 4.7 0 3.6 3.3 5.8 9.5 9.3"/><path d="M12 8.5c1-2.2 3-3.5 5-3.5 2.6 0 4.5 2 4.5 4.7 0 3.6-3.3 5.8-9.5 9.3"/><line x1="12" y1="8.5" x2="12" y2="18.9"/>',
    cart:'<circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2.2l2.1 11h9.9L19.2 8H6.4"/>',
    'mood-happy':'<circle cx="12" cy="12" r="9"/><circle cx="8.7" cy="10" r="1.1"/><circle cx="15.3" cy="10" r="1.1"/><path d="M8 14.3c1 1.6 2.5 2.4 4 2.4s3-.8 4-2.4"/>',
    'mood-empty':'<circle cx="12" cy="12" r="9"/><circle cx="8.7" cy="10.2" r="1.1"/><circle cx="15.3" cy="10.2" r="1.1"/><line x1="8" y1="15.3" x2="16" y2="15.3"/>',
    'mood-sad':'<circle cx="12" cy="12" r="9"/><circle cx="8.7" cy="10.8" r="1.1"/><circle cx="15.3" cy="10.8" r="1.1"/><path d="M8 17c1-1.6 2.5-2.4 4-2.4s3 .8 4 2.4"/><line x1="7" y1="7.6" x2="9.6" y2="8.6"/><line x1="17" y1="7.6" x2="14.4" y2="8.6"/>',
    'battery-4':'<rect x="2.5" y="8" width="17" height="8" rx="1.8"/><rect x="20.2" y="10.3" width="1.7" height="3.4" rx="0.8"/><rect x="4.2" y="9.8" width="13.4" height="4.4" rx="0.7" style="fill:currentColor;stroke:none"/>',
    'battery-2':'<rect x="2.5" y="8" width="17" height="8" rx="1.8"/><rect x="20.2" y="10.3" width="1.7" height="3.4" rx="0.8"/><rect x="4.2" y="9.8" width="6.7" height="4.4" rx="0.7" style="fill:currentColor;stroke:none"/>',
    'battery-1':'<rect x="2.5" y="8" width="17" height="8" rx="1.8"/><rect x="20.2" y="10.3" width="1.7" height="3.4" rx="0.8"/><rect x="4.2" y="9.8" width="2.6" height="4.4" rx="0.7" style="fill:currentColor;stroke:none"/>',
    lungs:'<path d="M12 3.5v8"/><path d="M12 10c-.8-2.2-2.8-3.6-4.8-3.2C4.4 7.3 3 9.8 3 12.6c0 2.7.9 5.9 2.7 7.4 1.1.9 2.3 1 3.3.2.8-.6 1-1.6 1-2.5V10z"/><path d="M12 10c.8-2.2 2.8-3.6 4.8-3.2 2.8.5 4.2 3 4.2 5.8 0 2.7-.9 5.9-2.7 7.4-1.1.9-2.3 1-3.3.2-.8-.6-1-1.6-1-2.5V10z"/>',
    kitchen:'<path d="M6 3v7"/><path d="M4 3v4.3a2 2 0 0 0 4 0V3"/><line x1="6" y1="10" x2="6" y2="21"/><path d="M17.5 3c-1.7 0-3 2.3-3 5.5s1.3 5.5 3 5.5v7"/>',
    'kitchen-off':'<path d="M6 3v7"/><path d="M4 3v4.3a2 2 0 0 0 4 0V3"/><line x1="6" y1="10" x2="6" y2="21"/><path d="M17.5 3c-1.7 0-3 2.3-3 5.5s1.3 5.5 3 5.5v7"/><line x1="3" y1="21" x2="21" y2="3"/>',
    'moon-stars':'<path d="M18.5 13.2a6 6 0 0 1-7.7-7.7 6 6 0 1 0 7.7 7.7z"/><path d="M5.5 4l.7 1.6L7.8 6.3l-1.6.7-.7 1.6-.7-1.6L3.2 6.3l1.6-.7z"/>',
    zzz:'<path d="M3 5.5h6l-6 6h6"/><path d="M11.5 12.5h5l-5 5h5"/><path d="M17.5 3.5h3.2l-3.2 3.2h3.2"/>',
    bandage:'<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-25 12 12)"/><circle cx="8.6" cy="9.3" r="0.6" transform="rotate(-25 12 12)"/><circle cx="15.4" cy="14.7" r="0.6" transform="rotate(-25 12 12)"/>',
    info:'<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.2"/><line x1="12" y1="7.6" x2="12" y2="7.7"/>',
    'device-watch':'<rect x="7.5" y="7" width="9" height="10" rx="2.4"/><path d="M9 7V4.5h6V7"/><path d="M9 17v2.5h6V17"/><path d="M12 10.2V12l1.4 1"/>',
    android:'<path d="M6 10v6.5"/><path d="M18 10v6.5"/><rect x="7" y="8.5" width="10" height="9" rx="1.5"/><line x1="9.5" y1="19.5" x2="9.5" y2="17.5"/><line x1="14.5" y1="19.5" x2="14.5" y2="17.5"/><line x1="9" y1="6.2" x2="10" y2="7.8"/><line x1="15" y1="6.2" x2="14" y2="7.8"/>',
    bluetooth:'<path d="M8 7l8 6.5-4 3.2V4.3l4 3.2-8 6.5"/>'
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
