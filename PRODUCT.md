# Product

## Register

product

## Users

**Members enrolled in the Self Care model, and their families** — the primary user is an older adult (e.g. Anita Nair, 68, Ernakulam) managing their own wellness day-to-day: daily check-ins, medications, vitals. Family members (including NRI relatives abroad) use the same app or a connected view to stay informed and involved without being physically present. Neither group is necessarily tech-fluent — this skews toward an older, less digitally confident audience than the Admin or Field apps, often using the app one-handed, sometimes with reduced dexterity or vision.

Primary job to be done: **feel looked after, with minimal effort** — log a daily check-in, take medications on schedule, see that vitals are normal, and know that help (family or care team) is one tap away if something's wrong.

## Product Purpose

The Care Bridge Home Wellness App is the mobile experience for the **Self Care** tier of the Care Model — the self-managed, lowest-touch face of Care Bridge Home's coordinated home care platform. It gives members: daily wellness check-ins (mood/energy/sleep), medication scheduling and refill tracking, wearable-integrated vitals, a personal tracker library (hydration, body metrics, blood pressure, blood sugar, steps, sleep, cycle, nutrition, workouts, heart rate), a Family Circle for permissioned sharing, direct lines to the Care Team, and Emergency SOS.

Success looks like: a member opens the app, sees at a glance that they're on track (or exactly what needs attention), completes today's check-in or medication in a few taps, and never feels alone even though the app, not a person, is the primary daily touchpoint.

## Brand Personality

Reassuring · Warm · Unhurried

This is the "reassurance-first" face of Care Bridge Home (per the platform's three-faces model — Admin is purple/"in control", Field is cyan/"fast, one clear action", Family is blue/"reassurance-first"). It should feel like a calm, competent companion — never clinical or paperwork-like, never childish or over-gamified. Streaks and wellness scores exist to encourage, not to gamify health into a competition.

Emotional goal: **"I'm looked after."** Confidence without alarm; warmth without infantilizing an adult managing their own care.

## Anti-references

- **Generic consumer fitness/wellness apps** (MyFitnessPal, Apple Health, Fitbit): too data-dense, too gamified, no visible care-team backbone. This app is never "just for you" — a care team is always implicitly present.
- **Clinical patient portals** (typical hospital MyChart-style EHR UIs): cold, form-heavy, bureaucratic. The opposite of reassuring.
- **Inconsistent, ungrounded mockup styling** (seen in early planning concepts — mismatched display fonts, decorative gradient backgrounds behind functional UI): pretty in isolation but breaks the shared design system and reads as un-produced. The shipped app should look like one coherent product, not a moodboard.

## Design Principles

1. **Reassurance over data-dump.** Lead with what matters — wellness score, next medication due, care status — before raw numbers. Detail is one tap deeper, not on the surface.
2. **One care system, tuned for the member.** Shares tokens, type system, and icon system with the Admin and Field apps (same underlying design system), but every choice is re-weighted for a member's emotional context rather than an operator's efficiency.
3. **Family and care team are never buried.** Care Team contact, Family Circle, and Emergency SOS are always reachable within one or two taps from Home.
4. **Big, bold, glanceable.** Larger touch targets and bolder iconography than the Admin Portal — this audience skews older, often uses the app one-handed, and should never have to squint or hunt.
5. **Trustworthy simplicity, no dark patterns.** Gamification (streaks, scores) supports motivation but never overrides clinical accuracy or nudges behavior for the app's benefit over the member's.

## Accessibility & Inclusion

Target: **WCAG 2.1 AA**, with a bias toward exceeding it given the primary audience skews older. Touch targets ≥44×44px (Apple HIG minimum). Body text and interactive elements ≥4.5:1 contrast; large text ≥3:1. Status is always communicated through label or icon plus color, never color alone. Full `prefers-reduced-motion` fallbacks. Dynamic type / relative units so text scales with system settings.
