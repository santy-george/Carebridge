# Product

## Register

product

## Users

**Care coordinators and admin staff** at Care Bridge Home — typically a small, skilled ops team managing 100–200+ members across Kerala. They work at a desktop or laptop for most of their shift; mobile is secondary. Their context is high-stakes and time-sensitive: they're juggling live field visits, emergencies, billing cycles, and staff coordination simultaneously. They are not technical users, but they are operationally fluent and expect the tool to keep up with them.

Primary job to be done: **understand what needs attention right now and act on it quickly** — from emergencies and missed visits to pending invoices and unassigned staff.

## Product Purpose

Care Bridge Home Admin Portal is the operational command centre for a Kerala-based coordinated home care and preventive wellness platform. It connects coordinators to the full lifecycle: lead → member → assessment → care model → scheduling → visits → reporting → billing → staff payments → analytics.

Success looks like: a coordinator can open the dashboard, immediately see what's critical, take action, and move on — without hunting for information or context-switching between tools.

## Brand Personality

Calm · Efficient · Modern

The interface should feel like a senior, experienced coordinator — quiet authority, no unnecessary noise, every piece of information earned its place. Not cold or clinical; there's a human care system behind it. Not warm or soft either; this is an ops tool running a real healthcare operation.

Emotional goal: **confidence and control**. The admin should feel like they have the whole system in their hands.

## Anti-references

- **Generic SaaS dashboards** (Salesforce, HubSpot, Monday.com): too configurable, too chrome-heavy, too "platform-y". The CBH portal should feel purpose-built for home care, not a horizontal tool reskinned.
- **Heavy data analytics tools** (Tableau, Looker, dark-mode BI): too data-dense, too intimidating, too much cognitive load. Data should support decisions, not dominate the screen.

## Design Principles

1. **Operational gravity first.** Emergencies, missed visits, unassigned staff — the dashboard surfaces what demands action before anything else. Information hierarchy follows urgency, not alphabetical order.
2. **Earn every pixel.** Nothing decorative. Every element either shows information, enables an action, or provides orientation. If removing it wouldn't confuse anyone, it shouldn't be there.
3. **Quiet but confident.** Purple is used with restraint — for active states, primary actions, and critical status — not as decoration. White space does the heavy lifting.
4. **One care system, three faces.** Admin (purple), Field Staff (cyan), and Family (blue) share the same data model and IA but present it at radically different levels of detail and urgency. Maintain cohesion across the three faces.
5. **Speed over completeness.** An admin scanning the dashboard should land on what matters in under 5 seconds. Details live one click deeper, not on the surface.

## Accessibility & Inclusion

Target: **WCAG 2.1 AA**. Body text and interactive elements must meet 4.5:1 contrast against their backgrounds. Large text (≥18px, or bold ≥14px) must meet 3:1. All interactive elements require keyboard accessibility and visible focus states. Provide `prefers-reduced-motion` fallbacks for all animations. Status is communicated through both colour and label (never colour alone).
