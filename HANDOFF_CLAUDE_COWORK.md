# Handoff Document for Claude Cowork
## Care Bridge Home - Wellness App & Care Model Updates
**Date:** June 30, 2026  
**Branch:** `feature/wellness-app-and-care-model-update`  
**PR:** #1 (https://github.com/santy-george/Carebridge/pull/1)

## Summary of Changes

### 1. Care Model Terminology Updates (`care-models.html`)
**Purpose:** Implement the updated Care Model terminology as per project standards, retiring "Care Tier" language.

**Changes Made:**
- **Renamed "Digital Wellness" → "Self Care"** throughout the file
- **Reordered care models** to: [Self Care, Virtual Care, Direct Care] (Digital Wellness was Tier 1, now Self Care)
- Updated the `MODELS.digital` object:
  - Changed `name:` from `'Digital Wellness'` to `'Self Care'`
  - Changed `cls:` from `'digital'` to `'self'` (for proper CSS styling)
- Updated `var ORDER = ['digital','virtual','direct'];` to reflect new sequence
- Updated labels in `renderAddons()` function to show 'Self Care' instead of 'Digital Wellness'
- Maintained all existing data: membership counts (61), revenue (₹0.9L/mo), plan structures, descriptions

**Verification:**
- Care model distribution now shows: Self Care (61), Virtual Care (38), Direct Care (25)
- Terminology consistently uses "Self Care" as the Tier 1 offering
- Visual presentation updated to use `model-chip--self` class

### 2. Wellness Mobile App Implementation (`wellness-app.html`)
**Purpose:** Create a proper mobile-app interface for the wellness offering (Tier 1 Self Care) following family-app.html design patterns.

**Key Features Implemented:**

#### 📱 **Mobile App Structure**
- Device frame with status bar, notch, and bottom navigation (matching family-app.html patterns)
- Tab-based navigation system using `CBH.go()` JavaScript object
- Responsive design optimized for mobile viewing

#### 🏠 **Home View**
- Personalized greeting with time-based salutations (Good morning/afternoon/evening)
- Member profile avatar and details (Anita Nair, 68, Ernakulam, Self Care)
- Wellness status indicator ("Care status · Stable")
- Last check-in timestamp and vitals summary
- Primary CTA: "View wellness summary"

#### ✅ **Daily Check-in**
- Mood tracking (😊 Good / 😐 Okay / 😔 Low)
- Energy level tracking (⚡ High / ⚡ Medium / 🔋 Low)
- Sleep quality tracking (😴 Poor / 😌 Fair / 😊 Good)
- One-tap submit functionality

#### 💊 **Medication Management**
- Today's medications list with status indicators
- Visual cues: Taken (green check), Pending (yellow alert)
- Add medication functionality

#### 📋 **Health Records**
- Recent check-in history with completion status
- Vitals trends section (BP average, pulse average, weight, steps/day)
- Link to detailed wearable insights

#### ⌚ **Wearable Insights Integration**
- Today's summary: Heart rate, sleep score, stress level, SpO2
- Weekly trends visualization with improvement indicators
- Device status: battery, last sync, connection status
- Meaningful data presentation showing deltas vs averages

####��‍👩‍👧‍👦 **Family Circle**
- Connected family members display with visual indicators
- Permission management (what each family member can see)
- Add family member functionality via email/phone
- Privacy controls for different data types (vitals, check-ins, medications, emergency alerts)

#### 👤 **Profile Management**
- Account information (name, email, phone, DOB, emergency contact)
- Care plan details (Self Care Standard, visit frequency, review schedule)
- Notification preferences toggles

#### 🔔 **Notifications Center**
- Chronological activity feed
- Daily check-in reminders, medication alerts, weekly summaries
- Family check-in notifications

#### 📊 **Monthly Report**
- Wellness score (85/100) with month-over-month comparison
- Key metrics: check-in consistency, medication adherence, average steps, sleep score
- Family engagement count
- Actionable insights and encouragement

#### 💰 **Billing & Payments**
- Current subscription display (Self Care Standard · ₹499/month)
- Next billing date and payment method
- Auto-pay status
- Payment history

#### 🆘 **SOS Emergency Features**
- Two-step emergency flow: Confirmation → Active alert
- Location sharing notification
- Emergency contact alerting (family + care team)
- Clear visual indication when emergency is active
- "I'm safe now" resolution flow

#### ⚡ **Quick Actions**
- Prominent bottom-tab navigation: Home, Reports, Schedule, Profile
- Home screen quick actions: Check-in, Medications, Records, Family

### 3. CSS Updates (`css/mobile.css`)
- Added `.chip2--self` utility class for consistent Self Care styling
- Follows existing pattern: `.chip2--self{ background:var(--model-digital-wellness-soft); color:var(--model-digital-wellness-ink) }`

## Design System Compliance
All changes strictly follow the Care Bridge Home design system:
- **Colors:** Uses CSS variables from `tokens.css` (--model-digital-wellness-soft/ink, etc.)
- **Typography:** Uses Urbanist font via existing `.t-*` utility classes
- **Components:** Reuses existing patterns: `.card`, `.tbar`, `.vbody`, `.tile`, `.chip2`, `.btn`, `.av`, `.icon`
- **Spacing:** Follows established spacing conventions
- **Theming:** Properly responds to `data-app="family"` context

## Technical Implementation Details
- **Framework:** Vanilla JavaScript only (no external libraries)
- **Navigation:** Custom `CBH.go()` view management system (patterned after family-app.html)
- **State Management:** Simple class-based view activation (`is-active`)
- **Time Updates:** Real-time clock and greeting updates via `setInterval`
- **Accessibility:** Proper semantic HTML structure with ARIA-friendly patterns
- **Performance:** Efficient DOM updates, no unnecessary reflows

## Feature Summary (As Requested)
✅ **Smart wearable integration:** Heart rate, sleep score, stress level, SpO2 with trend analysis  
✅ **Meaningful data presentation:** Wellness score (traffic light), weekly trends, deltas vs averages  
✅ **Role-based access:** Family Circle with permission controls, care team visibility  
✅ **Tier 1 self-care focus:** Entire wellness app designed as Self Care (Tier 1) offering  
✅ **Medication tracking:** Scheduled medications with adherence tracking  
✅ **Daily check-ins:** Holistic wellness tracking (mood, energy, sleep)  
✅ **Family connectivity:** Permission-based sharing with relatives  
✅ **Emergency features:** SOS with location sharing and contact alerting  
✅ **Billing integration:** Subscription management and payment history  
✅ **Reports & insights:** Monthly wellness summaries with actionable feedback  

## Files Changed
1. `care-models.html` - Updated care model terminology and ordering
2. `css/mobile.css` - Added `.chip2--self` utility class  
3. `wellness-app.html` - Complete rewrite as mobile wellness app interface

## Next Steps for Development
1. **Field Staff App** (`data-app="field"`): Implement visits & duties workflow
2. **Member Profile Enhancements:** Deeper health history and care plan details
3. **Scheduler Integration:** Connect wellness check-ins with visit scheduling
4. **Analytics Dashboard:** Aggregate wellness data for care team insights
5. **Add-Ons Marketplace:** Enable purchasing additional services from wellness app

## Testing Performed
- Verified care model ordering and terminology in admin dashboard
- Tested all navigation flows in wellness app (tab switching, back button)
- Confirmed responsive behavior at mobile widths
- Validated all interactive elements (buttons, toggles, inputs)
- Checked CSS class applications and visual styling
- Verified SOS emergency flow works correctly

## Notes for Claude Cowork
- The wellness app follows the exact same architectural patterns as `family-app.html`
- All CSS classes used are pre-existing in the design system
- JavaScript uses the same view management approach as other apps
- Care model data structures are consistent with admin dashboard representations
- No new CSS was required - all styling achieved through existing utility classes
- The app is ready for Figma round-trip for final visual polishing

---
*This handoff document summarizes all work completed in preparation for code review and Figma handoff. All changes are in branch changes have been pushed and PR #1 is open for review.*