/* @ds-bundle: {"format":4,"namespace":"CareBridgeHomeDesignSystem_a7b30c","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"MobileButton","sourcePath":"components/buttons/MobileButton.jsx"},{"name":"Banner","sourcePath":"components/cards/Banner.jsx"},{"name":"Card","sourcePath":"components/cards/Card.jsx"},{"name":"HeroCard","sourcePath":"components/cards/HeroCard.jsx"},{"name":"InfoCard","sourcePath":"components/cards/InfoCard.jsx"},{"name":"KpiCard","sourcePath":"components/cards/KpiCard.jsx"},{"name":"MobileChip","sourcePath":"components/chips/MobileChip.jsx"},{"name":"ModelChip","sourcePath":"components/chips/ModelChip.jsx"},{"name":"RiskBadge","sourcePath":"components/chips/RiskBadge.jsx"},{"name":"StatusChip","sourcePath":"components/chips/StatusChip.jsx"},{"name":"Avatar","sourcePath":"components/data/Avatar.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"Table","sourcePath":"components/data/Table.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Segmented","sourcePath":"components/forms/Segmented.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Icon","sourcePath":"components/icons/Icon.jsx"},{"name":"BottomNav","sourcePath":"components/mobile/BottomNav.jsx"},{"name":"ListRow","sourcePath":"components/mobile/ListRow.jsx"},{"name":"MobileTopBar","sourcePath":"components/mobile/MobileTopBar.jsx"},{"name":"StatusBar","sourcePath":"components/mobile/StatusBar.jsx"},{"name":"Tile","sourcePath":"components/mobile/Tile.jsx"},{"name":"VisitCard","sourcePath":"components/mobile/VisitCard.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"CheckinCard","sourcePath":"components/wellness/CheckinCard.jsx"},{"name":"MedicationItem","sourcePath":"components/wellness/MedicationItem.jsx"},{"name":"Toast","sourcePath":"components/wellness/Toast.jsx"},{"name":"WellnessRing","sourcePath":"components/wellness/WellnessRing.jsx"}],"sourceHashes":{"assets/icons/icons.js":"920169b336e6","components/buttons/Button.jsx":"1f691fc9c238","components/buttons/MobileButton.jsx":"6d59c10c2aea","components/cards/Banner.jsx":"38524c8ef6d6","components/cards/Card.jsx":"3e1cd49e6105","components/cards/HeroCard.jsx":"eace9b600547","components/cards/InfoCard.jsx":"49c94a66a58b","components/cards/KpiCard.jsx":"1f04c4bd59f3","components/chips/MobileChip.jsx":"a751117902a3","components/chips/ModelChip.jsx":"90944eb3e7f4","components/chips/RiskBadge.jsx":"2e28c5d450ea","components/chips/StatusChip.jsx":"0f2eeb83fa99","components/data/Avatar.jsx":"11629c3b264c","components/data/ProgressBar.jsx":"4ec534d2e9cf","components/data/Table.jsx":"3d3b22066f7f","components/forms/Field.jsx":"1db287a325e7","components/forms/Segmented.jsx":"b85bf79f0dc6","components/forms/Switch.jsx":"48739efd7a9a","components/icons/Icon.jsx":"0eec6128fb86","components/mobile/BottomNav.jsx":"04a9733f431f","components/mobile/ListRow.jsx":"cda4cb3f2ad4","components/mobile/MobileTopBar.jsx":"0ae2800415c6","components/mobile/StatusBar.jsx":"790a02344e25","components/mobile/Tile.jsx":"55e6810babc3","components/mobile/VisitCard.jsx":"c343be4a7674","components/navigation/NavItem.jsx":"4ff4eef85344","components/navigation/Sidebar.jsx":"7b84fb9ea3af","components/navigation/Tabs.jsx":"dcfc8fc4850e","components/wellness/CheckinCard.jsx":"27939d91121c","components/wellness/MedicationItem.jsx":"7869d5ce8a4b","components/wellness/Toast.jsx":"a485f9dd7e0b","components/wellness/WellnessRing.jsx":"9b5f5b47cff5","ui_kits/admin-portal/DashboardScreen.jsx":"9ce3b4e88b70","ui_kits/admin-portal/EmergencyScreen.jsx":"b44552137e8f","ui_kits/admin-portal/MemberProfileScreen.jsx":"bfd0967f688f","ui_kits/admin-portal/MembersScreen.jsx":"e1eb46538b4c","ui_kits/admin-portal/nav-data.jsx":"501888006720","ui_kits/field-app/FieldApp.jsx":"ac8d78e24019","ui_kits/wellness-app/WellnessApp.jsx":"50dbd58e6ae4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CareBridgeHomeDesignSystem_a7b30c = window.CareBridgeHomeDesignSystem_a7b30c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/icons/icons.js
try { (() => {
/* Care Bridge Home — outlined icon sprite (single source for all screens).
   Injects a hidden <svg> with <symbol> defs. Use: <svg class="icon"><use href="#i-NAME"/></svg> */
(function () {
  var S = {
    dashboard: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
    emergency: '<path d="M12 4.3 21 19.6H3z"/><line x1="12" y1="10" x2="12" y2="14.3"/><line x1="12" y1="16.8" x2="12" y2="16.9"/>',
    inbox: '<path d="M3.5 13 6 5.5h12L20.5 13"/><path d="M3.5 13v5.5h17V13h-4.4a3.1 3.1 0 0 1-6.2 0z"/>',
    members: '<circle cx="8" cy="8.5" r="2.8"/><circle cx="16" cy="8.5" r="2.8"/><path d="M3 18.5c0-2.6 2.2-4.5 5-4.5 1.2 0 2.3 .35 3.1 .95"/><path d="M21 18.5c0-2.6-2.2-4.5-5-4.5-1.2 0-2.3 .35-3.1 .95"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16" rx="2.2"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/><line x1="8.5" y1="11.5" x2="15.5" y2="11.5"/><line x1="8.5" y1="15" x2="13.5" y2="15"/>',
    models: '<path d="M12 3.5 21 8l-9 4.5L3 8z"/><path d="M3.5 12 12 16.3 20.5 12"/><path d="M3.5 16 12 20.3 20.5 16"/>',
    catalogue: '<path d="M4 11.6 11.6 4H20v8.4l-7.6 7.6a1.6 1.6 0 0 1-2.3 0L4 13.9a1.6 1.6 0 0 1 0-2.3z"/><circle cx="15.4" cy="8.6" r="1.5"/>',
    scheduler: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/>',
    duties: '<path d="M3.5 7 5 8.5 7.5 6"/><path d="M3.5 12.5 5 14 7.5 11.5"/><path d="M3.5 18 5 19.5 7.5 17"/><line x1="11" y1="7.2" x2="20.5" y2="7.2"/><line x1="11" y1="12.7" x2="20.5" y2="12.7"/><line x1="11" y1="18.2" x2="20.5" y2="18.2"/>',
    document: '<path d="M6.5 3.5h7.5l4 4v13H6.5z"/><path d="M13.5 3.5v4.2h4.2"/><line x1="9.5" y1="13" x2="15" y2="13"/><line x1="9.5" y1="16.5" x2="15" y2="16.5"/>',
    library: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    pin: '<path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.4"/>',
    hr: '<rect x="4.5" y="3.5" width="15" height="17" rx="2.4"/><circle cx="12" cy="10" r="2.6"/><path d="M8 17.6c0-2.1 1.8-3.5 4-3.5s4 1.4 4 3.5"/>',
    gps: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><line x1="12" y1="2.5" x2="12" y2="5.2"/><line x1="12" y1="18.8" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.2" y2="12"/><line x1="18.8" y1="12" x2="21.5" y2="12"/>',
    billing: '<path d="M6 3.5h12v17l-2.5-1.7L13 20.5l-2.5-1.7L8 20.5 6 19z"/><line x1="9" y1="8.5" x2="15" y2="8.5"/><line x1="9" y1="12" x2="15" y2="12"/>',
    payments: '<rect x="3.5" y="6" width="17" height="13" rx="2.4"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="14" y1="14.5" x2="17" y2="14.5"/>',
    reports: '<line x1="4" y1="20" x2="20.5" y2="20"/><rect x="5.5" y="11" width="3.2" height="6.5" rx="0.8"/><rect x="10.4" y="6.5" width="3.2" height="11" rx="0.8"/><rect x="15.3" y="13" width="3.2" height="4.5" rx="0.8"/>',
    pulse: '<path d="M3 12.5h3.5l2-5.5 3.5 11 2.2-7 1.6 3.5H21"/>',
    shield: '<path d="M12 3.5 19 6v5c0 4.6-3 8-7 9.5-4-1.5-7-4.9-7-9.5V6z"/><path d="M9 11.8l2.1 2.1 3.9-4"/>',
    cog: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.3v2.5"/><path d="M12 18.2v2.5"/><path d="M3.3 12h2.5"/><path d="M18.2 12h2.5"/><path d="M5.8 5.8 7.6 7.6"/><path d="M16.4 16.4l1.8 1.8"/><path d="M18.2 5.8 16.4 7.6"/><path d="M7.6 16.4 5.8 18.2"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.4 2.4 0 0 1 4.5 1.1c0 1.6-2 1.9-2 3.3"/><line x1="12" y1="17" x2="12" y2="17.1"/>',
    settings: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.1"/><circle cx="15" cy="12" r="2.1"/><circle cx="8" cy="17" r="2.1"/>',
    logout: '<path d="M14 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H14"/><line x1="10.5" y1="12" x2="21" y2="12"/><path d="M17.5 8.5 21 12l-3.5 3.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><line x1="15.8" y1="15.8" x2="20.5" y2="20.5"/>',
    bell: '<path d="M6.5 17h11l-1.4-2.3V11a4.1 4.1 0 0 0-8.2 0v3.7L6.5 17z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.2"/><path d="M4.5 7.5 12 12.7 19.5 7.5"/>',
    chevron: '<polyline points="9,6 15,12 9,18"/>',
    'chevron-down': '<polyline points="6,9 12,15 18,9"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trending: '<polyline points="4,15.5 10,9.5 13,12.5 20,5.5"/><polyline points="15,5.5 20,5.5 20,10.5"/>',
    more: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    swap: '<polyline points="7,4 4,7 7,10"/><line x1="4" y1="7" x2="20" y2="7"/><polyline points="17,14 20,17 17,20"/><line x1="20" y1="17" x2="4" y2="17"/>',
    check: '<polyline points="5,12.5 10,17.5 19,7"/>',
    phone: '<path d="M6 3.5h4l1.5 4-2 1.6a11 11 0 0 0 5.4 5.4l1.6-2 4 1.5v4a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4 6.7 2 2 0 0 1 6 3.5z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><polyline points="12,7 12,12 15.5,14"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6"/>',
    heart: '<path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20z"/>',
    'heart-pulse': '<path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20z"/><polyline points="7.2,11.2 9.4,11.2 10.4,9 11.6,13.2 12.6,11.2 16.8,11.2"/>',
    star: '<path d="M12 4 14.6 9.3 20.5 10.2 16.2 14.3 17.3 20.2 12 17.4 6.7 20.2 7.8 14.3 3.5 10.2 9.4 9.3z"/>',
    pill: '<rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(45 12 12)"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>',
    camera: '<path d="M4 8h3l1.5-2.2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
    map: '<path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/>',
    'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="6,11 12,5 18,11"/>',
    'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="6,13 12,19 18,13"/>',
    education: '<path d="M3 6 12 4l9 2-9 2z"/><path d="M7 9.5V15c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V9.5"/><line x1="21" y1="6" x2="21" y2="10"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3"/><path d="M16 5h3v2a3 3 0 0 1-3 3"/><line x1="12" y1="13" x2="12" y2="17"/><rect x="8.5" y="17" width="7" height="3" rx="1"/>',
    wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2.4"/><path d="M3.5 10h17"/><circle cx="16.5" cy="14.5" r="1.3"/>',
    chat: '<path d="M4 5.5h16v10H8l-4 3.5z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="12" x2="13" y2="12"/>',
    video: '<rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 11l6-3v8l-6-3"/>',
    lab: '<path d="M9 3v6L5 18a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-9V3"/><line x1="8" y1="3" x2="16" y2="3"/><line x1="7" y1="15" x2="17" y2="15"/>',
    therapy: '<path d="M4 8c0-2 2-4 5-4s5 2 5 4"/><path d="M14 8c0-2 2-4 5-4"/><path d="M4 8v6c0 3.3 2.2 6 5 6s5-2.7 5-6"/><path d="M14 8v6c0 3.3 2.2 6 5 6"/>',
    caregiver: '<circle cx="12" cy="6" r="2.5"/><path d="M5 20c0-3.4 3-6 7-6s7 2.6 7 6"/><path d="M9 11l-2 2"/><path d="M15 11l2 2"/>',
    'home-safety': '<path d="M4 10 12 4l8 6v9H4z"/><rect x="9.5" y="13" width="5" height="6"/><line x1="12" y1="13" x2="12" y2="19"/>',
    home: '<path d="M4 10.5 12 4l8 6.5"/><path d="M5.5 10.5V20h13v-9.5"/><rect x="9.5" y="13" width="5" height="7"/>',
    language: '<path d="M4 5h10"/><path d="M9 5v14"/><path d="M5 9h7"/><path d="M12 14l4 5 4-5"/><path d="M14 14h4"/>',
    mic: '<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><line x1="12" y1="17" x2="12" y2="20"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    route: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v5a4 4 0 0 0 4 4h4"/>',
    family: '<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><path d="M3 19c0-3 2.2-5 5-5s5 2 5 5"/><path d="M11 19c0-3 2.2-5 5-5s5 2 5 5"/>',
    award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 7 21l5-2.5L17 21l-2-7.5"/>',
    stethoscope: '<path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M6 4H4v2"/><path d="M14 4h2v2"/><path d="M10 13v3a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-2"/><circle cx="18" cy="14" r="2"/>',
    activity: '<polyline points="3,12 7,12 9,7 13,17 15,12 21,12"/>',
    moon: '<path d="M19 12a7 7 0 0 1-9.5 9.5 7 7 0 0 0 9.5-9.5z"/>',
    food: '<path d="M5 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M7 3v8"/><path d="M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v8"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.5A3 3 0 0 0 9 17V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.5A3 3 0 0 1 15 17V4z"/><line x1="12" y1="4" x2="12" y2="20"/>',
    walking: '<circle cx="12" cy="4.5" r="1.8"/><path d="M12 7v5l-2 7"/><path d="M12 12l3 3"/><path d="M10 10l-3 2"/>',
    upload: '<path d="M12 16V5"/><polyline points="7,10 12,5 17,10"/><path d="M5 19h14"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>',
    alert: '<path d="M12 3 2 20h20z"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.1"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    hands: '<path d="M12 2a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M5 14c0 3.9 3.1 7 7 7s7-3.1 7-7"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5.3"/><line x1="12" y1="18.7" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.3" y2="12"/><line x1="18.7" y1="12" x2="21.5" y2="12"/><line x1="5.1" y1="5.1" x2="7.1" y2="7.1"/><line x1="16.9" y1="16.9" x2="18.9" y2="18.9"/><line x1="18.9" y1="5.1" x2="16.9" y2="7.1"/><line x1="7.1" y1="16.9" x2="5.1" y2="18.9"/>',
    thyroid: '<path d="M12 8.5c-1-2.2-3-3.5-5-3.5-2.6 0-4.5 2-4.5 4.7 0 3.6 3.3 5.8 9.5 9.3"/><path d="M12 8.5c1-2.2 3-3.5 5-3.5 2.6 0 4.5 2 4.5 4.7 0 3.6-3.3 5.8-9.5 9.3"/><line x1="12" y1="8.5" x2="12" y2="18.9"/>',
    cart: '<circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2.2l2.1 11h9.9L19.2 8H6.4"/>',
    'mood-happy': '<circle cx="12" cy="12" r="9"/><circle cx="8.7" cy="10" r="1.1"/><circle cx="15.3" cy="10" r="1.1"/><path d="M8 14.3c1 1.6 2.5 2.4 4 2.4s3-.8 4-2.4"/>',
    'mood-empty': '<circle cx="12" cy="12" r="9"/><circle cx="8.7" cy="10.2" r="1.1"/><circle cx="15.3" cy="10.2" r="1.1"/><line x1="8" y1="15.3" x2="16" y2="15.3"/>',
    'mood-sad': '<circle cx="12" cy="12" r="9"/><circle cx="8.7" cy="10.8" r="1.1"/><circle cx="15.3" cy="10.8" r="1.1"/><path d="M8 17c1-1.6 2.5-2.4 4-2.4s3 .8 4 2.4"/><line x1="7" y1="7.6" x2="9.6" y2="8.6"/><line x1="17" y1="7.6" x2="14.4" y2="8.6"/>',
    'battery-4': '<rect x="2.5" y="8" width="17" height="8" rx="1.8"/><rect x="20.2" y="10.3" width="1.7" height="3.4" rx="0.8"/><rect x="4.2" y="9.8" width="13.4" height="4.4" rx="0.7" style="fill:currentColor;stroke:none"/>',
    'battery-2': '<rect x="2.5" y="8" width="17" height="8" rx="1.8"/><rect x="20.2" y="10.3" width="1.7" height="3.4" rx="0.8"/><rect x="4.2" y="9.8" width="6.7" height="4.4" rx="0.7" style="fill:currentColor;stroke:none"/>',
    'battery-1': '<rect x="2.5" y="8" width="17" height="8" rx="1.8"/><rect x="20.2" y="10.3" width="1.7" height="3.4" rx="0.8"/><rect x="4.2" y="9.8" width="2.6" height="4.4" rx="0.7" style="fill:currentColor;stroke:none"/>',
    lungs: '<path d="M12 3.5v8"/><path d="M12 10c-.8-2.2-2.8-3.6-4.8-3.2C4.4 7.3 3 9.8 3 12.6c0 2.7.9 5.9 2.7 7.4 1.1.9 2.3 1 3.3.2.8-.6 1-1.6 1-2.5V10z"/><path d="M12 10c.8-2.2 2.8-3.6 4.8-3.2 2.8.5 4.2 3 4.2 5.8 0 2.7-.9 5.9-2.7 7.4-1.1.9-2.3 1-3.3.2-.8-.6-1-1.6-1-2.5V10z"/>',
    kitchen: '<path d="M6 3v7"/><path d="M4 3v4.3a2 2 0 0 0 4 0V3"/><line x1="6" y1="10" x2="6" y2="21"/><path d="M17.5 3c-1.7 0-3 2.3-3 5.5s1.3 5.5 3 5.5v7"/>',
    'kitchen-off': '<path d="M6 3v7"/><path d="M4 3v4.3a2 2 0 0 0 4 0V3"/><line x1="6" y1="10" x2="6" y2="21"/><path d="M17.5 3c-1.7 0-3 2.3-3 5.5s1.3 5.5 3 5.5v7"/><line x1="3" y1="21" x2="21" y2="3"/>',
    'moon-stars': '<path d="M18.5 13.2a6 6 0 0 1-7.7-7.7 6 6 0 1 0 7.7 7.7z"/><path d="M5.5 4l.7 1.6L7.8 6.3l-1.6.7-.7 1.6-.7-1.6L3.2 6.3l1.6-.7z"/>',
    zzz: '<path d="M3 5.5h6l-6 6h6"/><path d="M11.5 12.5h5l-5 5h5"/><path d="M17.5 3.5h3.2l-3.2 3.2h3.2"/>',
    bandage: '<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-25 12 12)"/><circle cx="8.6" cy="9.3" r="0.6" transform="rotate(-25 12 12)"/><circle cx="15.4" cy="14.7" r="0.6" transform="rotate(-25 12 12)"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.2"/><line x1="12" y1="7.6" x2="12" y2="7.7"/>',
    'device-watch': '<rect x="7.5" y="7" width="9" height="10" rx="2.4"/><path d="M9 7V4.5h6V7"/><path d="M9 17v2.5h6V17"/><path d="M12 10.2V12l1.4 1"/>',
    android: '<path d="M6 10v6.5"/><path d="M18 10v6.5"/><rect x="7" y="8.5" width="10" height="9" rx="1.5"/><line x1="9.5" y1="19.5" x2="9.5" y2="17.5"/><line x1="14.5" y1="19.5" x2="14.5" y2="17.5"/><line x1="9" y1="6.2" x2="10" y2="7.8"/><line x1="15" y1="6.2" x2="14" y2="7.8"/>',
    bluetooth: '<path d="M8 7l8 6.5-4 3.2V4.3l4 3.2-8 6.5"/>',
    close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    download: '<path d="M12 4v12"/><polyline points="7,11 12,16 17,11"/><path d="M5 19h14"/>',
    crutches: '<line x1="7" y1="4" x2="7" y2="21"/><line x1="4" y1="7" x2="10" y2="7"/><line x1="4" y1="13.5" x2="10" y2="13.5"/><line x1="17" y1="4" x2="17" y2="21"/><line x1="14" y1="7" x2="20" y2="7"/><line x1="14" y1="13.5" x2="20" y2="13.5"/>',
    wheelchair: '<circle cx="8.5" cy="16" r="4.2"/><path d="M8.5 4.5v7.5h6.5l3 5"/><line x1="8.5" y1="12" x2="15" y2="12"/><circle cx="18.5" cy="19.2" r="1.3"/>',
    cylinder: '<rect x="8" y="6.5" width="8" height="15" rx="3"/><path d="M10 6.5V4.3a2 2 0 0 1 4 0v2.2"/><line x1="12" y1="2.3" x2="12" y2="4.3"/>',
    bed: '<path d="M3 19.5v-5.3a2 2 0 0 1 2-2h5.5l8-2.6v5.4"/><line x1="3" y1="19.5" x2="21" y2="19.5"/><line x1="3" y1="16.2" x2="21" y2="16.2"/>'
  };
  var fill = {
    more: 1
  };
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
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/icons/icons.js", error: String((e && e.message) || e) }); }

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — the desktop/Admin-Portal button (pill radius, .btn classes).
 */
function Button({
  variant = "primary",
  size = "md",
  icon,
  block = false,
  disabled = false,
  children,
  className = "",
  ...rest
}) {
  const cls = ["btn", "btn--" + variant, size === "sm" ? "btn--sm" : "", block ? "btn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    disabled: disabled
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/MobileButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MobileButton — the Field/Wellness app button (14px radius, .mbtn classes).
 * Visually distinct from the desktop Button on purpose: rounder-but-not-pill,
 * bigger touch target, built for a thumb not a cursor.
 */
function MobileButton({
  variant = "fill",
  size = "md",
  icon,
  block = false,
  disabled = false,
  children,
  className = "",
  ...rest
}) {
  const cls = ["mbtn", "mbtn--" + variant, size === "sm" ? "mbtn--sm" : "", block ? "mbtn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    disabled: disabled
  }, rest), icon, children);
}
Object.assign(__ds_scope, { MobileButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/MobileButton.jsx", error: String((e && e.message) || e) }); }

// components/cards/Banner.jsx
try { (() => {
/** Banner — mobile equivalent of InfoCard (.banner--*): rounder icon, bigger radius. */
function Banner({
  tone = "info",
  icon,
  title,
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["banner", "banner--" + tone, className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, icon), /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("div", {
    className: "bt"
  }, title), children && /*#__PURE__*/React.createElement("div", {
    className: "bs"
  }, children)));
}
Object.assign(__ds_scope, { Banner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Banner.jsx", error: String((e && e.message) || e) }); }

// components/cards/Card.jsx
try { (() => {
/** Card — generic desktop content card (.card). */
function Card({
  title,
  subtitle,
  link,
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["card", className].filter(Boolean).join(" ")
  }, (title || link) && /*#__PURE__*/React.createElement("div", {
    className: "card__head",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("div", {
    className: "card__title"
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "card__sub"
  }, subtitle)), link), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Card.jsx", error: String((e && e.message) || e) }); }

// components/cards/HeroCard.jsx
try { (() => {
/** HeroCard — mobile "dominant answer" card (.hero-card): a soft accent radial
 * highlight behind the corner, shadow-md, meant to be the single focal card
 * on a Wellness/Field screen (never two per screen). */
function HeroCard({
  tag,
  children,
  onClick,
  className = ""
}) {
  const cls = ["hero-card", onClick ? "tap" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    onClick: onClick
  }, tag && /*#__PURE__*/React.createElement("span", {
    className: "htag"
  }, tag), children);
}
Object.assign(__ds_scope, { HeroCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/HeroCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/InfoCard.jsx
try { (() => {
/** InfoCard — desktop alert/callout block (.info-card--*) with a colored round icon tile. */
function InfoCard({
  tone = "info",
  icon,
  title,
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["info-card", "info-card--" + tone, className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("span", {
    className: "info-card__icon"
  }, icon), /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("h4", null, title), children && /*#__PURE__*/React.createElement("p", null, children)));
}
Object.assign(__ds_scope, { InfoCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/InfoCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/KpiCard.jsx
try { (() => {
/** KpiCard — big-number stat card (.kpi) for dashboard summary rows. */
function KpiCard({
  label,
  value,
  icon,
  footnote,
  delta,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["kpi", className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi__num"
  }, icon, /*#__PURE__*/React.createElement("h3", null, value)), /*#__PURE__*/React.createElement("div", {
    className: "kpi__foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, label), footnote, delta));
}
Object.assign(__ds_scope, { KpiCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/KpiCard.jsx", error: String((e && e.message) || e) }); }

// components/chips/MobileChip.jsx
try { (() => {
/** MobileChip — mobile pill (.chip2--*), the mobile-app equivalent of StatusChip. */
function MobileChip({
  tone = "neutral",
  icon,
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: ["chip2", "chip2--" + tone, className].filter(Boolean).join(" ")
  }, icon, children);
}
Object.assign(__ds_scope, { MobileChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chips/MobileChip.jsx", error: String((e && e.message) || e) }); }

// components/chips/ModelChip.jsx
try { (() => {
/** ModelChip — Care Model identity pill (.model-chip--*). Self Care / Virtual Care / Direct Care. */
function ModelChip({
  model = "self",
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: ["model-chip", "model-chip--" + model, className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), children);
}
Object.assign(__ds_scope, { ModelChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chips/ModelChip.jsx", error: String((e && e.message) || e) }); }

// components/chips/RiskBadge.jsx
try { (() => {
/** RiskBadge — solid-fill risk-level pill (.risk--*), used in clinical/scheduling contexts. */
function RiskBadge({
  level = "low",
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: ["risk", "risk--" + level, className].filter(Boolean).join(" ")
  }, children);
}
Object.assign(__ds_scope, { RiskBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chips/RiskBadge.jsx", error: String((e && e.message) || e) }); }

// components/chips/StatusChip.jsx
try { (() => {
/** StatusChip — desktop visit/task status pill (.chip--*). */
function StatusChip({
  status = "scheduled",
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: ["chip", "chip--" + status, className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), children);
}
Object.assign(__ds_scope, { StatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chips/StatusChip.jsx", error: String((e && e.message) || e) }); }

// components/data/Avatar.jsx
try { (() => {
/** Avatar — initials circle (.avatar), used throughout for people (staff, members, family). */
function Avatar({
  initials,
  size = "md",
  src,
  style,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: ["avatar", size === "sm" ? "avatar--sm" : "", className].filter(Boolean).join(" "),
    style: style
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: initials || ""
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressBar.jsx
try { (() => {
/** ProgressBar — thin rounded fill bar (.bar), used for adherence % and plan progress. */
function ProgressBar({
  percent = 0,
  color,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["bar", className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: percent + "%",
      background: color || "var(--accent)"
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/data/Table.jsx
try { (() => {
/** Table — desktop data table (.table). Pass column headers and row arrays of cells. */
function Table({
  columns,
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("table", {
    className: ["table", className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    className: c.right ? "t-right" : ""
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, children));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Table.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
/** Field — labeled text input (.field). Works for both desktop and mobile screens (same markup). */
function Field({
  label,
  error,
  className = "",
  inputProps = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["field", error ? "is-error" : "", className].filter(Boolean).join(" ")
  }, label && /*#__PURE__*/React.createElement("label", null, label), /*#__PURE__*/React.createElement("div", {
    className: "control"
  }, /*#__PURE__*/React.createElement("input", inputProps)), error && /*#__PURE__*/React.createElement("div", {
    className: "hint"
  }, error));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Segmented.jsx
try { (() => {
/** Segmented — desktop pill-tab segmented control (.segmented). */
function Segmented({
  options,
  value,
  onChange,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["segmented", className].filter(Boolean).join(" ")
  }, options.map(opt => /*#__PURE__*/React.createElement("button", {
    key: opt,
    className: opt === value ? "is-active" : "",
    onClick: () => onChange && onChange(opt)
  }, opt)));
}
Object.assign(__ds_scope, { Segmented });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Segmented.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/** Switch — round toggle (.sw), used for settings & permission rows (mobile + desktop). */
function Switch({
  on = false,
  onChange,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: ["sw", on ? "on" : "", className].filter(Boolean).join(" "),
    onClick: () => onChange && onChange(!on),
    role: "switch",
    "aria-checked": on
  });
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/icons/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — renders one glyph from the shared outlined sprite (js/icons.js).
 * The sprite must be loaded once per page (assets/icons/icons.js appends a
 * hidden <svg><symbol> defs block to <body>); this component just references it.
 */
function Icon({
  name,
  size = "md",
  fill = false,
  className = "",
  style,
  ...rest
}) {
  const sizeClass = size === "sm" ? "icon--sm" : size === "lg" ? "icon--lg" : "";
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ["icon", sizeClass, className].filter(Boolean).join(" "),
    style: style,
    "data-fill": fill ? "" : undefined
  }, rest), /*#__PURE__*/React.createElement("svg", null, /*#__PURE__*/React.createElement("use", {
    href: "#i-" + name
  })));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icons/Icon.jsx", error: String((e && e.message) || e) }); }

// components/mobile/BottomNav.jsx
try { (() => {
/** BottomNav — mobile tab bar (.bnav), fixed to the device bottom, blurred translucent. */
function BottomNav({
  items,
  activeId,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "bnav"
  }, items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it.id,
    className: "bnav__i" + (it.id === activeId ? " is-active" : "") + (it.sos ? " sos" : ""),
    href: it.href || "#",
    onClick: e => {
      if (!it.href) e.preventDefault();
      if (onSelect) onSelect(it.id);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, it.icon), it.label)));
}
Object.assign(__ds_scope, { BottomNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobile/BottomNav.jsx", error: String((e && e.message) || e) }); }

// components/mobile/ListRow.jsx
try { (() => {
/** ListRow — mobile list row (.row) with icon tile, title/subtitle, trailing value or chevron. */
function ListRow({
  icon,
  tone,
  title,
  subtitle,
  value,
  unit,
  chevron = false,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: onClick ? "row tap" : "row",
    onClick: onClick
  }, icon && /*#__PURE__*/React.createElement("div", {
    className: "ic" + (tone ? " ic--" + tone : "")
  }, icon), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, subtitle)), value != null && /*#__PURE__*/React.createElement("div", {
    className: "val"
  }, value, " ", unit && /*#__PURE__*/React.createElement("span", {
    className: "u"
  }, unit)), chevron && /*#__PURE__*/React.createElement("span", {
    className: "icon chev"
  }, /*#__PURE__*/React.createElement("svg", null, /*#__PURE__*/React.createElement("use", {
    href: "#i-chevron"
  }))));
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobile/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/mobile/MobileTopBar.jsx
try { (() => {
/** MobileTopBar — mobile screen header (.tbar): eyebrow + title, trailing action. */
function MobileTopBar({
  eyebrow,
  title,
  small = false,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    className: small ? "sm" : ""
  }, title)), action);
}
Object.assign(__ds_scope, { MobileTopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobile/MobileTopBar.jsx", error: String((e && e.message) || e) }); }

// components/mobile/StatusBar.jsx
try { (() => {
/** StatusBar — mobile device status bar (.sbar): time + signal/battery icon slot. */
function StatusBar({
  time = "9:41",
  icons
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "sbar"
  }, /*#__PURE__*/React.createElement("span", null, time), /*#__PURE__*/React.createElement("span", {
    className: "dots"
  }, icons));
}
Object.assign(__ds_scope, { StatusBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobile/StatusBar.jsx", error: String((e && e.message) || e) }); }

// components/mobile/Tile.jsx
try { (() => {
/** Tile — mobile metric tile (.tile), used in 2-col grids for quick stats. */
function Tile({
  icon,
  value,
  label,
  tone,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["tile", tone ? "tile--" + tone : "", className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, icon), /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, value), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, label));
}
Object.assign(__ds_scope, { Tile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobile/Tile.jsx", error: String((e && e.message) || e) }); }

// components/mobile/VisitCard.jsx
try { (() => {
/** VisitCard — mobile visit summary card (.visit): time block, member, meta chips, footer. */
function VisitCard({
  time,
  dateLabel,
  name,
  meta,
  chips,
  footer,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: onClick ? "visit tap" : "visit",
    onClick: onClick
  }, /*#__PURE__*/React.createElement("div", {
    className: "visit__top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "visit__when"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, time), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, dateLabel)), /*#__PURE__*/React.createElement("div", {
    className: "visit__sep"
  }), /*#__PURE__*/React.createElement("div", {
    className: "visit__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "mt"
  }, meta), chips && /*#__PURE__*/React.createElement("div", {
    className: "visit__meta"
  }, chips))), footer && /*#__PURE__*/React.createElement("div", {
    className: "visit__foot"
  }, footer));
}
Object.assign(__ds_scope, { VisitCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobile/VisitCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
/** NavItem — one admin sidebar link (.nav-item), with active left-bar indicator + optional badge. */
function NavItem({
  icon,
  label,
  active = false,
  badge,
  alert = false,
  href = "#",
  className = ""
}) {
  return /*#__PURE__*/React.createElement("a", {
    className: ["nav-item", active ? "is-active" : "", className].filter(Boolean).join(" "),
    href: href
  }, icon, /*#__PURE__*/React.createElement("span", {
    className: "nav-item__label"
  }, label), badge != null && /*#__PURE__*/React.createElement("span", {
    className: ["nav-badge", alert ? "nav-badge--alert" : ""].filter(Boolean).join(" ")
  }, badge));
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
/**
 * Sidebar — the full Admin Portal sidebar shell (.sidebar): logo, grouped
 * nav sections, and a footer user-card. Pass `groups` (label + array of
 * NavItem-shaped objects) and it renders the whole IA in lifecycle order.
 */
function Sidebar({
  logo,
  groups,
  user,
  activeId
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar__logo"
  }, logo), /*#__PURE__*/React.createElement("nav", {
    className: "sidebar__nav"
  }, groups.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.name
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-tag"
  }, g.name), /*#__PURE__*/React.createElement("div", {
    className: "nav-group__items"
  }, g.items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it.id,
    className: "nav-item" + (it.id === activeId ? " is-active" : ""),
    href: it.href || "#"
  }, it.icon, /*#__PURE__*/React.createElement("span", {
    className: "nav-item__label"
  }, it.label), it.badge != null && /*#__PURE__*/React.createElement("span", {
    className: "nav-badge" + (it.alert ? " nav-badge--alert" : "")
  }, it.badge))))))), user && /*#__PURE__*/React.createElement("div", {
    className: "sidebar__foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "user-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "avatar avatar--sm",
    style: {
      background: "var(--purple-300)",
      color: "#fff"
    }
  }, user.initials), /*#__PURE__*/React.createElement("span", {
    className: "user-card__txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, user.name), /*#__PURE__*/React.createElement("span", {
    className: "role"
  }, user.role)))));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/** Tabs — underline tab row (.tabs/.tab), for switching sub-views within a page (e.g. member profile). */
function Tabs({
  items,
  value,
  onChange,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["tabs", className].filter(Boolean).join(" ")
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.id,
    className: "tab" + (it.id === value ? " is-active" : ""),
    onClick: () => onChange && onChange(it.id)
  }, it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, it.count))));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/wellness/CheckinCard.jsx
try { (() => {
/** CheckinCard — daily wellness check-in card (.checkin) with quick choice-pill questions. */
function CheckinCard({
  day,
  questions
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "checkin"
  }, /*#__PURE__*/React.createElement("div", {
    className: "checkin__head"
  }, /*#__PURE__*/React.createElement("h3", null, "Daily check-in"), day && /*#__PURE__*/React.createElement("span", {
    className: "day"
  }, day)), questions.map((q, i) => /*#__PURE__*/React.createElement("div", {
    className: "checkin__q",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "ql"
  }, q.label), /*#__PURE__*/React.createElement("div", {
    className: "checkin__choices"
  }, q.options.map(opt => /*#__PURE__*/React.createElement("span", {
    key: opt.label,
    className: "choice" + (opt.selected ? " on" + (opt.tone ? "-" + opt.tone : "") : "")
  }, opt.label))))));
}
Object.assign(__ds_scope, { CheckinCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/wellness/CheckinCard.jsx", error: String((e && e.message) || e) }); }

// components/wellness/MedicationItem.jsx
try { (() => {
/** MedicationItem — one row in the Medications list (.med-item), taken/missed states. */
function MedicationItem({
  icon,
  name,
  dose,
  time,
  state
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "med-item" + (state ? " med-item--" + state : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, icon), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dose"
  }, dose), /*#__PURE__*/React.createElement("span", null, time))), /*#__PURE__*/React.createElement("div", {
    className: "med-item__toggle"
  }, /*#__PURE__*/React.createElement("span", {
    className: "icon"
  }, /*#__PURE__*/React.createElement("svg", null, /*#__PURE__*/React.createElement("use", {
    href: "#i-check"
  })))));
}
Object.assign(__ds_scope, { MedicationItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/wellness/MedicationItem.jsx", error: String((e && e.message) || e) }); }

// components/wellness/Toast.jsx
try { (() => {
/** Toast — dark floating confirmation toast (.toast) for mobile screens. */
function Toast({
  tone = "ok",
  icon,
  children,
  show = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "toast-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "toast" + (show ? " show" : "") + (tone ? " toast--" + tone : "")
  }, icon, children));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/wellness/Toast.jsx", error: String((e && e.message) || e) }); }

// components/wellness/WellnessRing.jsx
try { (() => {
/** WellnessRing — signature "one number" conic-gradient ring (.w-ring). */
function WellnessRing({
  percent = 85,
  value,
  color = "var(--success)",
  ink = "var(--success)"
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "w-ring",
    style: {
      "--ring-color": color,
      "--ring-pct": percent + "%",
      "--ring-ink": ink
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-ring-num",
    style: {
      color: ink
    }
  }, value));
}
Object.assign(__ds_scope, { WellnessRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/wellness/WellnessRing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin-portal/DashboardScreen.jsx
try { (() => {
const {
  Icon,
  KpiCard,
  StatusChip,
  ModelChip,
  RiskBadge,
  Avatar,
  InfoCard,
  Button
} = window.CareBridgeHomeDesignSystem_a7b30c;
function DashboardScreen({
  go
}) {
  return /*#__PURE__*/React.createElement("main", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "greeting reveal"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Good morning, Joel"), /*#__PURE__*/React.createElement("p", null, "Here are the decisions and exceptions requiring coordination today")), /*#__PURE__*/React.createElement("span", {
    className: "date-chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: "sm"
  }), "Tuesday, 23 June 2026")), /*#__PURE__*/React.createElement("div", {
    className: "reveal reveal-2",
    style: {
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      border: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement(InfoCard, {
    tone: "danger",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "emergency"
    }),
    title: "2 active emergencies"
  }, "Kumari Lakshmi N. \u2014 Kakkanad \xB7 SOS raised 4 min ago"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px 16px"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm",
    onClick: () => go("emergency")
  }, "Open Emergency Centre ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: "sm"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "kpi-row reveal reveal-3"
  }, /*#__PURE__*/React.createElement(KpiCard, {
    label: "Visits today",
    value: "18",
    delta: /*#__PURE__*/React.createElement("span", {
      className: "delta delta--up"
    }, "10 done")
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Active members",
    value: "124",
    delta: /*#__PURE__*/React.createElement("span", {
      className: "delta delta--up"
    }, "+6%")
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Assessments overdue",
    value: "3",
    delta: /*#__PURE__*/React.createElement("span", {
      className: "delta delta--warn"
    }, "2 days")
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Payments to approve",
    value: "\u20B931,500",
    delta: /*#__PURE__*/React.createElement("span", {
      className: "delta delta--flat"
    }, "4 items")
  })), /*#__PURE__*/React.createElement("div", {
    className: "dash-grid reveal reveal-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card__head",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "card__title"
  }, "Today's Visits"), /*#__PURE__*/React.createElement("a", {
    className: "card__link",
    href: "#",
    onClick: e => {
      e.preventDefault();
      go("visits");
    }
  }, "View all ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: "sm"
  }))), [{
    s: "completed",
    n: "Kumari Lakshmi N.",
    m: "Wound Care · Vitals",
    d: "Kakkanad",
    t: "09:00",
    i: "KL"
  }, {
    s: "inprogress",
    n: "Anjali Mohan",
    m: "Medication · Vitals",
    d: "Aluva",
    t: "10:00",
    i: "AM"
  }, {
    s: "scheduled",
    n: "Gopal Nair",
    m: "Physiotherapy",
    d: "Irinjalakuda",
    t: "11:30",
    i: "GN"
  }, {
    s: "missed",
    n: "Babu Thomas",
    m: "Initial assessment",
    d: "Kottayam",
    t: "08:30",
    i: "BT"
  }].map(v => /*#__PURE__*/React.createElement("div", {
    className: "visit-row",
    key: v.n
  }, /*#__PURE__*/React.createElement(StatusChip, {
    status: v.s
  }, v.s === "inprogress" ? "In progress" : v.s[0].toUpperCase() + v.s.slice(1)), /*#__PURE__*/React.createElement(Avatar, {
    initials: v.i,
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    className: "row__main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, v.n), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, v.m)), /*#__PURE__*/React.createElement("span", {
    className: "dist"
  }, v.d), /*#__PURE__*/React.createElement("span", {
    className: "time"
  }, v.t))))), /*#__PURE__*/React.createElement("div", {
    className: "col-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card__title",
    style: {
      marginBottom: 12
    }
  }, "Care Model Distribution"), [{
    m: "self",
    l: "Self Care",
    c: 58
  }, {
    m: "virtual",
    l: "Virtual Care",
    c: 41
  }, {
    m: "direct",
    l: "Direct Care",
    c: 25
  }].map(r => /*#__PURE__*/React.createElement("div", {
    key: r.m,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 0"
    }
  }, /*#__PURE__*/React.createElement(ModelChip, {
    model: r.m
  }, r.l), /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-heading)"
    }
  }, r.c)))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card__title",
    style: {
      marginBottom: 12
    }
  }, "Risk watchlist"), [{
    n: "Rajan Nair",
    r: "high"
  }, {
    n: "Mary Varghese",
    r: "medium"
  }].map(p => /*#__PURE__*/React.createElement("div", {
    key: p.n,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, p.n), /*#__PURE__*/React.createElement(RiskBadge, {
    level: p.r
  }, p.r[0].toUpperCase() + p.r.slice(1), " risk")))))));
}
window.DashboardScreen = DashboardScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin-portal/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin-portal/EmergencyScreen.jsx
try { (() => {
const {
  Icon,
  Button,
  Avatar
} = window.CareBridgeHomeDesignSystem_a7b30c;
const CASES = [{
  n: "Kumari Lakshmi N.",
  d: "Kakkanad",
  meta: "SOS raised 4 min ago · Nurse Sree Rekha R. notified · Awaiting acknowledgement",
  t: "09:14"
}, {
  n: "Rajan Nair",
  d: "Thrissur",
  meta: "Fall alert triggered 18 min ago · Field staff en route · ETA 12 min",
  t: "08:56"
}];
function EmergencyScreen({
  go
}) {
  return /*#__PURE__*/React.createElement("main", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "greeting reveal"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Emergency Centre"), /*#__PURE__*/React.createElement("p", null, "All active SOS and fall-alert cases requiring coordination")), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: () => go("dashboard")
  }, "Back to dashboard")), /*#__PURE__*/React.createElement("div", {
    className: "reveal reveal-2",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, CASES.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.n,
    className: "card",
    style: {
      borderColor: "color-mix(in srgb, var(--danger) 30%, var(--border))",
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: "999px",
      background: "var(--danger)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "emergency",
    style: {
      color: "#fff"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: "var(--danger-text)"
    }
  }, c.n, " \u2014 ", c.d), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, c.meta)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-muted)"
    }
  }, c.t), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm"
  }, "Acknowledge")))));
}
window.EmergencyScreen = EmergencyScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin-portal/EmergencyScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin-portal/MemberProfileScreen.jsx
try { (() => {
const {
  Icon,
  Avatar,
  ModelChip,
  StatusChip,
  Tabs,
  ProgressBar,
  Button
} = window.CareBridgeHomeDesignSystem_a7b30c;
function MemberProfileScreen({
  member,
  go
}) {
  const [tab, setTab] = React.useState("overview");
  const m = member || {
    i: "KL",
    n: "Kumari Lakshmi N.",
    id: "CBH-C-0012 · F · 78y",
    model: "direct",
    plan: "Premium",
    district: "Kakkanad"
  };
  return /*#__PURE__*/React.createElement("main", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "greeting reveal"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => go("members")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    style: {
      transform: "scaleX(-1)"
    }
  })), /*#__PURE__*/React.createElement(Avatar, {
    initials: m.i,
    style: {
      width: 52,
      height: 52,
      fontSize: 16
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 24
    }
  }, m.n), /*#__PURE__*/React.createElement("p", null, m.id, " \xB7 ", m.district))), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "document"
    })
  }, "Export profile")), /*#__PURE__*/React.createElement("div", {
    className: "reveal reveal-2",
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(ModelChip, {
    model: m.model
  }, m.model === "self" ? "Self Care" : m.model === "virtual" ? "Virtual Care" : "Direct Care"), /*#__PURE__*/React.createElement("span", {
    className: "plan" + (m.plan !== "Basic" ? " plan--" + m.plan.toLowerCase() : "")
  }, m.plan), /*#__PURE__*/React.createElement(StatusChip, {
    status: "completed"
  }, "Active")), /*#__PURE__*/React.createElement("div", {
    className: "reveal reveal-3"
  }, /*#__PURE__*/React.createElement(Tabs, {
    items: [{
      id: "overview",
      label: "Overview"
    }, {
      id: "assessments",
      label: "Assessments",
      count: 3
    }, {
      id: "visits",
      label: "Visits",
      count: 12
    }, {
      id: "billing",
      label: "Billing"
    }],
    value: tab,
    onChange: setTab
  })), /*#__PURE__*/React.createElement("div", {
    className: "dash-grid reveal reveal-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card__title",
    style: {
      marginBottom: 12
    }
  }, "Care plan adherence"), /*#__PURE__*/React.createElement(ProgressBar, {
    percent: 82
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 8
    }
  }, "82% of scheduled visits completed on time this month")), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card__title",
    style: {
      marginBottom: 12
    }
  }, "Recent visits"), [{
    n: "Wound Care · Vitals",
    d: "23 Jun · Sree Rekha R."
  }, {
    n: "Physiotherapy",
    d: "19 Jun · Meera P."
  }].map(v => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: v.n
  }, /*#__PURE__*/React.createElement("div", {
    className: "row__main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, v.n), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, v.d)), /*#__PURE__*/React.createElement(StatusChip, {
    status: "completed"
  }, "Completed"))))), /*#__PURE__*/React.createElement("div", {
    className: "col-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card__title",
    style: {
      marginBottom: 12
    }
  }, "Assigned staff"), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement(Avatar, {
    initials: "SR",
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    className: "row__main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, "Sree Rekha R."), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, "Registered Nurse")))))));
}
window.MemberProfileScreen = MemberProfileScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin-portal/MemberProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin-portal/MembersScreen.jsx
try { (() => {
const {
  Icon,
  Avatar,
  ModelChip,
  StatusChip,
  Button
} = window.CareBridgeHomeDesignSystem_a7b30c;
const MEMBERS = [{
  i: "KL",
  n: "Kumari Lakshmi N.",
  id: "CBH-C-0012 · F · 78y",
  model: "direct",
  plan: "Premium",
  district: "Kakkanad",
  staff: "Sree Rekha R.",
  billing: "completed",
  status: "completed"
}, {
  i: "AM",
  n: "Anjali Mohan",
  id: "CBH-C-0008 · F · 65y",
  model: "virtual",
  plan: "Standard",
  district: "Aluva",
  staff: "Sree Rekha R.",
  billing: "pending",
  status: "completed"
}, {
  i: "GN",
  n: "Gopal Nair",
  id: "CBH-C-0019 · M · 72y",
  model: "direct",
  plan: "Premium",
  district: "Irinjalakuda",
  staff: "Meera P.",
  billing: "missed",
  status: "completed"
}, {
  i: "RK",
  n: "Radha Krishnan",
  id: "CBH-C-0031 · F · 58y",
  model: "self",
  plan: "Basic",
  district: "Guruvayur",
  staff: "—",
  billing: "scheduled",
  status: "completed"
}, {
  i: "SP",
  n: "Suresh Pillai",
  id: "CBH-C-0044 · M · 55y",
  model: "self",
  plan: "Standard",
  district: "Changanacherry",
  staff: "—",
  billing: "completed",
  status: "completed"
}, {
  i: "BT",
  n: "Babu Thomas",
  id: "CBH-C-0061 · M · 80y",
  model: "direct",
  plan: "Standard",
  district: "Kottayam",
  staff: "Anitha K.",
  billing: "completed",
  status: "pending"
}];
function MembersScreen({
  go
}) {
  return /*#__PURE__*/React.createElement("main", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "greeting reveal"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Members"), /*#__PURE__*/React.createElement("p", null, "124 active members across the Care Bridge Home programme")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    })
  }, "Add Member")), /*#__PURE__*/React.createElement("div", {
    className: "kpi-row reveal reveal-2"
  }, [{
    l: "Active members",
    v: "124",
    s: "+6% vs last month"
  }, {
    l: "New this month",
    v: "9",
    s: "vs 7 last month"
  }, {
    l: "Needs assessment",
    v: "7",
    s: "3 overdue"
  }, {
    l: "Unassigned",
    v: "2",
    s: "No care model"
  }].map(k => /*#__PURE__*/React.createElement("div", {
    className: "kpi",
    key: k.l
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi__num"
  }, /*#__PURE__*/React.createElement("h3", null, k.v)), /*#__PURE__*/React.createElement("div", {
    className: "kpi__foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, k.l))))), /*#__PURE__*/React.createElement("div", {
    className: "card reveal reveal-3",
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Member"), /*#__PURE__*/React.createElement("th", null, "Care Model"), /*#__PURE__*/React.createElement("th", null, "Plan"), /*#__PURE__*/React.createElement("th", null, "District"), /*#__PURE__*/React.createElement("th", null, "Assigned staff"), /*#__PURE__*/React.createElement("th", null, "Billing"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, MEMBERS.map(m => /*#__PURE__*/React.createElement("tr", {
    key: m.n,
    style: {
      cursor: "pointer"
    },
    onClick: () => go("member-profile", m)
  }, /*#__PURE__*/React.createElement("td", {
    className: "member"
  }, /*#__PURE__*/React.createElement(Avatar, {
    initials: m.i,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, m.n)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(ModelChip, {
    model: m.model
  }, m.model === "self" ? "Self Care" : m.model === "virtual" ? "Virtual Care" : "Direct Care")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "plan" + (m.plan !== "Basic" ? " plan--" + m.plan.toLowerCase() : "")
  }, m.plan)), /*#__PURE__*/React.createElement("td", null, m.district), /*#__PURE__*/React.createElement("td", null, m.staff), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusChip, {
    status: m.billing
  }, m.billing[0].toUpperCase() + m.billing.slice(1))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusChip, {
    status: m.status
  }, m.status[0].toUpperCase() + m.status.slice(1)))))))));
}
window.MembersScreen = MembersScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin-portal/MembersScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin-portal/nav-data.jsx
try { (() => {
const NAV_GROUPS = [{
  name: "Overview",
  items: [{
    id: "dashboard",
    label: "Dashboard",
    icon: "dashboard"
  }, {
    id: "emergency",
    label: "Emergency Centre",
    icon: "emergency",
    badge: 2,
    alert: true
  }]
}, {
  name: "Membership & Care",
  items: [{
    id: "leads",
    label: "Leads & Enquiries",
    icon: "inbox",
    badge: 5
  }, {
    id: "members",
    label: "Members",
    icon: "members"
  }, {
    id: "assessments",
    label: "Assessments",
    icon: "clipboard"
  }, {
    id: "care-models",
    label: "Care Models",
    icon: "models"
  }, {
    id: "catalogue",
    label: "Service Catalogue",
    icon: "catalogue"
  }]
}, {
  name: "Operations",
  items: [{
    id: "scheduler",
    label: "Scheduler",
    icon: "scheduler"
  }, {
    id: "visits",
    label: "Visits & Duties",
    icon: "duties"
  }, {
    id: "visit-reports",
    label: "Visit Reports",
    icon: "document",
    badge: 3
  }, {
    id: "allocation",
    label: "Area Allocation",
    icon: "pin"
  }]
}, {
  name: "Workforce",
  items: [{
    id: "hr",
    label: "Human Resources",
    icon: "hr"
  }, {
    id: "attendance",
    label: "Attendance & GPS",
    icon: "gps"
  }]
}, {
  name: "Finance",
  items: [{
    id: "billing",
    label: "Billing & Invoices",
    icon: "billing",
    badge: 2
  }, {
    id: "payments",
    label: "Staff Payments",
    icon: "payments",
    badge: 4
  }]
}, {
  name: "Insights",
  items: [{
    id: "analytics",
    label: "Reports & Analytics",
    icon: "reports"
  }, {
    id: "health",
    label: "Health Analytics",
    icon: "pulse"
  }]
}, {
  name: "Admin",
  items: [{
    id: "users",
    label: "Users & Roles",
    icon: "shield"
  }, {
    id: "settings",
    label: "Settings",
    icon: "cog"
  }]
}];
Object.assign(window, {
  NAV_GROUPS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin-portal/nav-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/field-app/FieldApp.jsx
try { (() => {
const {
  Icon,
  MobileButton,
  MobileChip,
  VisitCard,
  Tile
} = window.CareBridgeHomeDesignSystem_a7b30c;
function LoginView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login__art"
  }, /*#__PURE__*/React.createElement("img", {
    className: "login__logo",
    src: "../../assets/logos/cbh-logo.svg",
    alt: "Care Bridge Home"
  }), /*#__PURE__*/React.createElement("span", {
    className: "login__app"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "duties",
    size: "sm"
  }), "Field Care"), /*#__PURE__*/React.createElement("h1", null, "Welcome back, Anjali"), /*#__PURE__*/React.createElement("p", null, "Sign in to start your shift in Ernakulam.")), /*#__PURE__*/React.createElement("div", {
    className: "login__form"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Staff ID or email"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    defaultValue: "anjali.thomas@carebridge.in"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    defaultValue: "care1234"
  })), /*#__PURE__*/React.createElement("div", {
    className: "login__row"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Forgot password?")), /*#__PURE__*/React.createElement(MobileButton, {
    variant: "fill",
    block: true,
    onClick: () => go("today")
  }, "Sign in & start shift"), /*#__PURE__*/React.createElement(MobileButton, {
    variant: "line",
    block: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "shield"
    }),
    onClick: () => go("today")
  }, "Use biometric login"), /*#__PURE__*/React.createElement("div", {
    className: "login__demo"
  }, "Demo login \u2014 ", /*#__PURE__*/React.createElement("b", null, "anjali.thomas@carebridge.in"), " \xB7 ", /*#__PURE__*/React.createElement("b", null, "care1234"))), /*#__PURE__*/React.createElement("div", {
    className: "login__foot"
  }, /*#__PURE__*/React.createElement("span", null, "Secure sign-in \xB7 \xA9 2026 Care Bridge Home \xB7 Kerala"))));
}
function TodayView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Thursday, 25 June"), /*#__PURE__*/React.createElement("h1", null, "Good morning, Anjali")), /*#__PURE__*/React.createElement("button", {
    className: "avatar-btn"
  }, "AT")), /*#__PURE__*/React.createElement("div", {
    className: "vbody has-nav"
  }, /*#__PURE__*/React.createElement(MobileChip, {
    tone: "neutral"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: "sm"
  }), "Assigned area \xB7 Ernakulam"), /*#__PURE__*/React.createElement("div", {
    className: "tiles"
  }, /*#__PURE__*/React.createElement(Tile, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "scheduler"
    }),
    value: 6,
    label: "Visits today",
    tone: "accent"
  }), /*#__PURE__*/React.createElement(Tile, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "check"
    }),
    value: 2,
    label: "Completed",
    tone: "ok"
  }), /*#__PURE__*/React.createElement(Tile, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "clock"
    }),
    value: 1,
    label: "In progress"
  }), /*#__PURE__*/React.createElement(Tile, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "document"
    }),
    value: 1,
    label: "Pending reports",
    tone: "warn"
  })), /*#__PURE__*/React.createElement("div", {
    className: "sec"
  }, "Up next \xB7 10:30 AM"), /*#__PURE__*/React.createElement("div", {
    className: "hero-card tap",
    onClick: () => go("visitDetail")
  }, /*#__PURE__*/React.createElement("span", {
    className: "htag"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: "sm"
  }), "Next visit \xB7 10:30 AM"), /*#__PURE__*/React.createElement("div", {
    className: "idblock",
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "av"
  }, "MV"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, "Mary Varghese"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "76 \xB7 Female \xB7 Ernakulam"))), /*#__PURE__*/React.createElement("div", {
    className: "visit__meta",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(MobileChip, {
    tone: "direct"
  }, "Direct Care"), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "neutral"
  }, "Standard plan"), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "risk-med"
  }, "Medium risk")), /*#__PURE__*/React.createElement(MobileButton, {
    variant: "fill",
    block: true,
    style: {
      marginTop: 14
    },
    onClick: e => {
      e.stopPropagation();
      go("visitDetail");
    }
  }, "View visit")), /*#__PURE__*/React.createElement("div", {
    className: "sec"
  }, "Later today"), /*#__PURE__*/React.createElement("div", {
    className: "card card--flush"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row row--time tap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, "12:15"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, "PM")), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Govind Menon"), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Physio assist \xB7 Kadavanthra")), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "neutral"
  }, "Scheduled")), /*#__PURE__*/React.createElement("div", {
    className: "row row--time tap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, "2:00"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, "PM")), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Mary Thomas"), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Wellness check \xB7 Vyttila")), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "neutral"
  }, "Scheduled"))))), /*#__PURE__*/React.createElement("nav", {
    className: "bnav"
  }, /*#__PURE__*/React.createElement("a", {
    className: "bnav__i is-active",
    href: "#",
    onClick: e => e.preventDefault()
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "scheduler"
  })), "Today"), /*#__PURE__*/React.createElement("a", {
    className: "bnav__i",
    href: "#",
    onClick: e => e.preventDefault()
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "duties"
  })), "Visits"), /*#__PURE__*/React.createElement("a", {
    className: "bnav__i",
    href: "#",
    onClick: e => e.preventDefault()
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wallet"
  })), "Earnings"), /*#__PURE__*/React.createElement("a", {
    className: "bnav__i",
    href: "#",
    onClick: e => e.preventDefault()
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user"
  })), "Profile")));
}
function VisitDetailView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "backbtn",
    onClick: () => go("today")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron"
  })), /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sm"
  }, "Visit details")), /*#__PURE__*/React.createElement("button", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "vbody has-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "idblock"
  }, /*#__PURE__*/React.createElement("span", {
    className: "av"
  }, "MV"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, "Mary Varghese"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "76 \xB7 Female \xB7 ID CBH-1042"))), /*#__PURE__*/React.createElement("div", {
    className: "visit__meta",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(MobileChip, {
    tone: "direct"
  }, "Direct Care"), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "neutral"
  }, "Standard plan"), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "risk-med"
  }, "Medium risk"))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "card__title"
  }, "Visit"), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "neutral"
  }, "Scheduled")), /*#__PURE__*/React.createElement("div", {
    className: "rows",
    style: {
      margin: "-6px -16px -8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Type")), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "Wellness Home Visit")), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Time")), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "10:30 AM ", /*#__PURE__*/React.createElement("span", {
    className: "u"
  }, "\xB7 ~45 min"))))), /*#__PURE__*/React.createElement("div", {
    className: "acc active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "acc__h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "acc__num",
    style: {
      border: "none",
      background: "var(--surface-sunken)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pulse",
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "acc__t"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tt"
  }, "Medical summary"), /*#__PURE__*/React.createElement("div", {
    className: "ss"
  }, "Conditions \xB7 allergies \xB7 medication")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    className: "acc__chev"
  })), /*#__PURE__*/React.createElement("div", {
    className: "acc__b",
    style: {
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rows",
    style: {
      margin: "0 -16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Conditions"), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Type 2 diabetes \xB7 hypertension \xB7 post-op wound care"))), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Allergies"), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Penicillin")))))))), /*#__PURE__*/React.createElement("div", {
    className: "cta-bar"
  }, /*#__PURE__*/React.createElement(MobileButton, {
    variant: "fill",
    block: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "gps"
    }),
    onClick: () => go("gps")
  }, "Start visit \xB7 GPS check-in")));
}
function GpsView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "backbtn",
    onClick: () => go("visitDetail")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron"
  })), /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sm"
  }, "Check-in"))), /*#__PURE__*/React.createElement("div", {
    className: "vbody has-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gps"
  }, /*#__PURE__*/React.createElement("div", {
    className: "radar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "core"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gps",
    size: "lg"
  }))), /*#__PURE__*/React.createElement("h2", null, "Ready to check in"), /*#__PURE__*/React.createElement("p", null, "Tap below to confirm you've arrived at the visit address. Check-in is GPS-verified within 100 m.")), /*#__PURE__*/React.createElement("div", {
    className: "gps__meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Member"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "Mary Varghese")), /*#__PURE__*/React.createElement("div", {
    className: "r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Location"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "Ernakulam")), /*#__PURE__*/React.createElement("div", {
    className: "r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "GPS status"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gps",
    size: "sm",
    style: {
      color: "var(--text-subtle)"
    }
  }), "Ready")))), /*#__PURE__*/React.createElement("div", {
    className: "cta-bar"
  }, /*#__PURE__*/React.createElement(MobileButton, {
    variant: "fill",
    block: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "gps"
    }),
    onClick: () => go("active")
  }, "Check in here")));
}
function ActiveVisitView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "backbtn",
    onClick: () => go("today")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron"
  })), /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sm"
  }, "Active visit")), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "accent"
  }, "In progress")), /*#__PURE__*/React.createElement("div", {
    className: "vbody has-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "timer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "live"
  }), "Visit in progress"), /*#__PURE__*/React.createElement("div", {
    className: "clock"
  }, "14:52"), /*#__PURE__*/React.createElement("div", {
    className: "t-body-s",
    style: {
      color: "var(--text-muted)"
    }
  }, "Checked in 10:32 AM"))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "idblock"
  }, /*#__PURE__*/React.createElement("span", {
    className: "av"
  }, "MV"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "nm",
    style: {
      fontSize: 16
    }
  }, "Mary Varghese"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Wellness Home Visit \xB7 Direct Care")))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "card__title"
  }, "Report progress"), /*#__PURE__*/React.createElement(MobileChip, {
    tone: "neutral"
  }, "3 of 8")), /*#__PURE__*/React.createElement("div", {
    className: "pbar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "37%"
    }
  }))), /*#__PURE__*/React.createElement(MobileButton, {
    variant: "sos",
    block: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "emergency"
    })
  }, "Raise emergency / SOS")), /*#__PURE__*/React.createElement("div", {
    className: "cta-bar"
  }, /*#__PURE__*/React.createElement(MobileButton, {
    variant: "fill",
    block: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "clipboard"
    })
  }, "Continue report")));
}
function FieldApp() {
  const [view, setView] = React.useState("login");
  const Views = {
    login: LoginView,
    today: TodayView,
    visitDetail: VisitDetailView,
    gps: GpsView,
    active: ActiveVisitView
  };
  const Current = Views[view];
  return /*#__PURE__*/React.createElement("div", {
    className: "stage",
    "data-app": "field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "device"
  }, /*#__PURE__*/React.createElement("div", {
    className: "notch"
  }), /*#__PURE__*/React.createElement("div", {
    className: "screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sbar"
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    className: "dots"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gps",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: "sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "stack"
  }, /*#__PURE__*/React.createElement(Current, {
    go: setView
  })))));
}
window.FieldApp = FieldApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/field-app/FieldApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wellness-app/WellnessApp.jsx
try { (() => {
const {
  Icon,
  MobileButton,
  MobileChip,
  Banner,
  WellnessRing,
  MedicationItem,
  BottomNav
} = window.CareBridgeHomeDesignSystem_a7b30c;
function LoginView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login__art"
  }, /*#__PURE__*/React.createElement("img", {
    className: "login__logo",
    src: "../../assets/logos/cbh-logo.svg",
    alt: "Care Bridge Home"
  }), /*#__PURE__*/React.createElement("span", {
    className: "login__app"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart-pulse",
    size: "sm"
  }), "Wellness App"), /*#__PURE__*/React.createElement("h1", null, "Welcome back, Anita"), /*#__PURE__*/React.createElement("p", null, "Sign in to see today's check-in, medications and vitals.")), /*#__PURE__*/React.createElement("div", {
    className: "login__form"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Mobile number"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    defaultValue: "+91 98470 12345"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "PIN"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    defaultValue: "\u2022\u2022\u2022\u2022"
  })), /*#__PURE__*/React.createElement("div", {
    className: "login__row"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Forgot PIN?")), /*#__PURE__*/React.createElement(MobileButton, {
    variant: "fill",
    block: true,
    onClick: () => go("home")
  }, "Sign in"), /*#__PURE__*/React.createElement("div", {
    className: "login__demo"
  }, "Demo login \u2014 ", /*#__PURE__*/React.createElement("b", null, "+91 98470 12345"), " \xB7 PIN ", /*#__PURE__*/React.createElement("b", null, "1234"))), /*#__PURE__*/React.createElement("div", {
    className: "login__foot"
  }, /*#__PURE__*/React.createElement("span", null, "Secure sign-in \xB7 \xA9 2026 Care Bridge Home \xB7 Kerala"))));
}
function HomeView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Good morning"), /*#__PURE__*/React.createElement("h1", null, "Anita Nair")), /*#__PURE__*/React.createElement("button", {
    className: "avatar-btn"
  }, "AN")), /*#__PURE__*/React.createElement("div", {
    className: "vbody has-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-card",
    style: {
      borderRadius: "var(--radius-2xl)",
      boxShadow: "var(--shadow-md)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "htag",
    style: {
      background: "var(--model-digital-wellness-soft)",
      color: "var(--model-digital-wellness-ink)"
    }
  }, "Self Care \xB7 Standard"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(WellnessRing, {
    percent: 85,
    value: "85",
    color: "var(--success)",
    ink: "var(--success)"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-heading)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--text-heading)"
    }
  }, "Wellness score"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 3
    }
  }, "You're on track today \u2014 keep it up")))), /*#__PURE__*/React.createElement(Banner, {
    tone: "ok",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "check"
    }),
    title: "All good today"
  }, "Morning check-in completed \xB7 vitals normal"), /*#__PURE__*/React.createElement("div", {
    className: "sec"
  }, "Today's medications", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      go("meds");
    }
  }, "See all")), /*#__PURE__*/React.createElement("div", {
    className: "card card--flush"
  }, /*#__PURE__*/React.createElement(MedicationItem, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "pill"
    }),
    name: "Metformin 500mg",
    dose: "1 tablet",
    time: "8:00 AM",
    state: "taken"
  }), /*#__PURE__*/React.createElement(MedicationItem, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "pill"
    }),
    name: "Amlodipine 5mg",
    dose: "1 tablet",
    time: "8:00 AM"
  })), /*#__PURE__*/React.createElement("div", {
    className: "sec"
  }, "Care team"), /*#__PURE__*/React.createElement("div", {
    className: "card card--flush"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "avatar avatar--sm",
    style: {
      background: "var(--accent-soft)",
      color: "var(--accent-text)"
    }
  }, "SN"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Sree Nair"), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Primary nurse")), /*#__PURE__*/React.createElement("button", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: "sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "avatar avatar--sm",
    style: {
      background: "var(--purple-100)",
      color: "var(--purple-700)"
    }
  }, "JA"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Joel Abraham"), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Care coordinator")), /*#__PURE__*/React.createElement("button", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: "sm"
  }))))), /*#__PURE__*/React.createElement(MobileButton, {
    variant: "sos",
    block: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "emergency"
    })
  }, "Emergency \u2014 call for help")), /*#__PURE__*/React.createElement(BottomNav, {
    activeId: "home",
    onSelect: go,
    items: [{
      id: "home",
      label: "Home",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "heart"
      })
    }, {
      id: "health",
      label: "Health",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pulse"
      })
    }, {
      id: "meds",
      label: "Meds",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pill"
      })
    }, {
      id: "trackers",
      label: "Trackers",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "activity"
      })
    }]
  }));
}
const MED_BANDS = [{
  label: "Morning",
  tint: "#FCF3E2",
  items: [{
    n: "Metformin 500mg",
    d: "1 tablet",
    t: "8:00 AM",
    s: "taken"
  }, {
    n: "Amlodipine 5mg",
    d: "1 tablet",
    t: "8:00 AM",
    s: "taken"
  }]
}, {
  label: "Noon",
  tint: "#EAF0FB",
  items: [{
    n: "Vitamin D3",
    d: "1 capsule",
    t: "1:00 PM"
  }]
}, {
  label: "Evening",
  tint: "#E8FAFD",
  items: [{
    n: "Metformin 500mg",
    d: "1 tablet",
    t: "8:00 PM"
  }]
}, {
  label: "Night",
  tint: "#F5F0FA",
  items: [{
    n: "Atorvastatin 10mg",
    d: "1 tablet",
    t: "10:00 PM"
  }]
}];
function MedsView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sm"
  }, "Medications")), /*#__PURE__*/React.createElement("button", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "vbody has-nav"
  }, MED_BANDS.map(band => /*#__PURE__*/React.createElement(React.Fragment, {
    key: band.label
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec"
  }, band.label.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "card card--flush",
    style: {
      background: band.tint,
      border: "none"
    }
  }, band.items.map(it => /*#__PURE__*/React.createElement(MedicationItem, {
    key: it.n,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "pill"
    }),
    name: it.n,
    dose: it.d,
    time: it.t,
    state: it.s
  })))))), /*#__PURE__*/React.createElement(BottomNav, {
    activeId: "meds",
    onSelect: go,
    items: [{
      id: "home",
      label: "Home",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "heart"
      })
    }, {
      id: "health",
      label: "Health",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pulse"
      })
    }, {
      id: "meds",
      label: "Meds",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pill"
      })
    }, {
      id: "trackers",
      label: "Trackers",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "activity"
      })
    }]
  }));
}
const TRACKERS = [{
  icon: "food",
  n: "Hydration",
  v: "5",
  u: "/8 glasses"
}, {
  icon: "heart-pulse",
  n: "Blood pressure",
  v: "138/86",
  u: "mmHg"
}, {
  icon: "activity",
  n: "Blood sugar",
  v: "146",
  u: "mg/dL"
}, {
  icon: "walking",
  n: "Steps",
  v: "3,240",
  u: "steps"
}, {
  icon: "moon",
  n: "Sleep",
  v: "6.5",
  u: "hrs"
}, {
  icon: "pulse",
  n: "Heart rate",
  v: "78",
  u: "bpm"
}];
function TrackersView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sm"
  }, "Trackers"))), /*#__PURE__*/React.createElement("div", {
    className: "vbody has-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tiles"
  }, TRACKERS.map(t => /*#__PURE__*/React.createElement("div", {
    className: "tracker-card card",
    key: t.n,
    style: {
      padding: "14px 15px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic",
    style: {
      width: 32,
      height: 32,
      borderRadius: 9,
      background: "var(--accent-soft)",
      color: "var(--accent-text)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-heading)",
      fontWeight: 700,
      fontSize: 20,
      color: "var(--text-heading)"
    }
  }, t.v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, t.u), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-heading)",
      marginTop: 6
    }
  }, t.n))))), /*#__PURE__*/React.createElement(BottomNav, {
    activeId: "trackers",
    onSelect: go,
    items: [{
      id: "home",
      label: "Home",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "heart"
      })
    }, {
      id: "health",
      label: "Health",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pulse"
      })
    }, {
      id: "meds",
      label: "Meds",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pill"
      })
    }, {
      id: "trackers",
      label: "Trackers",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "activity"
      })
    }]
  }));
}
function FamilyCircleView({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "view is-active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "backbtn",
    onClick: () => go("home")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron"
  })), /*#__PURE__*/React.createElement("div", {
    className: "tbar__title"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sm"
  }, "Family Circle"))), /*#__PURE__*/React.createElement("div", {
    className: "vbody has-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "circle-member"
  }, /*#__PURE__*/React.createElement("span", {
    className: "av"
  }, "SV"), /*#__PURE__*/React.createElement("div", {
    className: "info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, "Susan Varghese"), /*#__PURE__*/React.createElement("div", {
    className: "rel"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "globe",
    size: "sm"
  }), "Daughter \xB7 Dubai, UAE")), /*#__PURE__*/React.createElement("span", {
    className: "perm lvl-full"
  }, "Full access")), /*#__PURE__*/React.createElement("div", {
    className: "circle-member"
  }, /*#__PURE__*/React.createElement("span", {
    className: "av"
  }, "RN"), /*#__PURE__*/React.createElement("div", {
    className: "info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, "Ravi Nair"), /*#__PURE__*/React.createElement("div", {
    className: "rel"
  }, "Son \xB7 Ernakulam")), /*#__PURE__*/React.createElement("span", {
    className: "perm"
  }, "View only"))), /*#__PURE__*/React.createElement(MobileButton, {
    variant: "soft",
    block: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    })
  }, "Invite family member")), /*#__PURE__*/React.createElement(BottomNav, {
    activeId: "home",
    onSelect: go,
    items: [{
      id: "home",
      label: "Home",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "heart"
      })
    }, {
      id: "health",
      label: "Health",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pulse"
      })
    }, {
      id: "meds",
      label: "Meds",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pill"
      })
    }, {
      id: "trackers",
      label: "Trackers",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "activity"
      })
    }]
  }));
}
function WellnessApp() {
  const [view, setView] = React.useState("login");
  const Views = {
    login: LoginView,
    home: HomeView,
    meds: MedsView,
    trackers: TrackersView,
    family: FamilyCircleView,
    health: HomeView
  };
  const Current = Views[view] || HomeView;
  return /*#__PURE__*/React.createElement("div", {
    className: "stage",
    "data-app": "family"
  }, /*#__PURE__*/React.createElement("div", {
    className: "device"
  }, /*#__PURE__*/React.createElement("div", {
    className: "notch"
  }), /*#__PURE__*/React.createElement("div", {
    className: "screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sbar"
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    className: "dots"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: "sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "stack"
  }, /*#__PURE__*/React.createElement(Current, {
    go: setView
  })))));
}
window.WellnessApp = WellnessApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wellness-app/WellnessApp.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.MobileButton = __ds_scope.MobileButton;

__ds_ns.Banner = __ds_scope.Banner;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.HeroCard = __ds_scope.HeroCard;

__ds_ns.InfoCard = __ds_scope.InfoCard;

__ds_ns.KpiCard = __ds_scope.KpiCard;

__ds_ns.MobileChip = __ds_scope.MobileChip;

__ds_ns.ModelChip = __ds_scope.ModelChip;

__ds_ns.RiskBadge = __ds_scope.RiskBadge;

__ds_ns.StatusChip = __ds_scope.StatusChip;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Segmented = __ds_scope.Segmented;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.BottomNav = __ds_scope.BottomNav;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.MobileTopBar = __ds_scope.MobileTopBar;

__ds_ns.StatusBar = __ds_scope.StatusBar;

__ds_ns.Tile = __ds_scope.Tile;

__ds_ns.VisitCard = __ds_scope.VisitCard;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.CheckinCard = __ds_scope.CheckinCard;

__ds_ns.MedicationItem = __ds_scope.MedicationItem;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.WellnessRing = __ds_scope.WellnessRing;

})();
