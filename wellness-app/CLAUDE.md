# Project decisions

- All heading elements (h1, `.sec` section labels, `.tt` accordion/card titles, h2/h3) must be colored `var(--purple-700)` across every screen. Include this rule (`.tbar__title h1, .sec, .tt, h2, h3 { color: var(--purple-700); }`) in each new screen's helmet `<style>` block — the `.tbar__title` prefix on `h1` is required to beat mobile.css's `.tbar__title h1` specificity.
