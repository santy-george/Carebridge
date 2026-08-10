# DPDP Act 2023 — Compliance Research Brief for Care Bridge Home

**Prepared for:** Care Bridge Home (Ernakulam & Thiruvalla, Kerala)
**Date:** August 2026
**Status:** RESEARCH DRAFT — NOT LEGAL ADVICE
**Critical caveat:** The DPDP Act 2023 was passed by Parliament in August 2023, but as of mid-2026 many of its provisions **still await enabling Rules and government notifications** before they become enforceable. The Data Protection Board of India has not yet been fully constituted. Timelines, thresholds, and procedural details below are drawn from the Act's text and public draft rules; the final shape may differ. **Every section flagged with ⚠️ must be verified with a qualified Indian data-privacy lawyer before you rely on it.**

---

## 1. Does the DPDP Act classify health data specially?

**Short answer: No — the DPDP Act 2023 does NOT create a separate "sensitive personal data" category.** This is a deliberate departure from both the GDPR (which has "special categories" including health data) and India's older SPDI Rules under the IT Act, 2000 (which listed "physical, physiological and mental health condition" as sensitive personal data).

**What this means for Care Bridge Home:**
- Health data (medical conditions, allergies, medications, vitals, mood data, wearable data) is treated as **ordinary personal data** under the Act.
- There are no *automatic* extra obligations triggered solely by collecting health data — no mandatory Data Protection Impact Assessment (DPIA), no blanket ban on processing, no higher consent standard written into the Act itself.
- **However**, the Act gives the Central Government power to declare certain data fiduciaries as **"Significant Data Fiduciaries"** based on volume, sensitivity, risk of harm, and other factors. A health-data platform — even a small one — could be designated as Significant, which would then trigger additional obligations (see Section 4 below).

**⚠️ Verify:** The government's power to notify additional categories of data or impose sector-specific obligations (e.g., for health data) exists under the Act. Whether the Ministry of Health or MeitY will issue health-data-specific rules is unknown as of mid-2026. Ask your lawyer whether any such notifications have been issued.

**Practical takeaway:** Don't assume health data is "just like any other data." Even without a formal sensitive-data category, a health-data breach would likely attract higher penalties and reputational damage. Treat it as high-risk data in your internal policies regardless of the Act's flat classification.

---

## 2. Who is the Data Fiduciary vs Data Processor?

| Role | Who in Care Bridge Home | What the Act says |
|------|------------------------|-------------------|
| **Data Fiduciary** | **Care Bridge Home itself** (the company, as the entity that decides *why* and *how* patient data is collected and used) | The Data Fiduciary is the person/entity that alone or jointly determines the **purpose and means** of processing personal data. Bears primary compliance responsibility: consent, notice, grievance redressal, breach notification, deletion. |
| **Data Processor** | **Supabase** (cloud database hosting in Mumbai), **Sentry** (error monitoring), **Cloudflare** (CDN), and any other third-party service that handles data on Care Bridge Home's instructions | Processes data **on behalf of** the Data Fiduciary. Must follow the fiduciary's instructions, implement security safeguards, and report breaches to the fiduciary. Not directly accountable to data principals (users) under the Act — the fiduciary remains liable. |

**Key obligations:**

- **Care Bridge Home (Fiduciary):** Must enter into a **valid contract** with each Data Processor that specifies the scope, duration, nature, and purpose of processing, the type of personal data, and obligations of the processor. Even if Supabase's standard ToS covers some of this, you likely need a Data Processing Agreement (DPA) addendum.
- **Supabase (Processor):** Must not process data for its own purposes, must delete/return data when the contract ends, and must notify Care Bridge Home of any breach "without undue delay."
- **Sentry / Cloudflare:** If they process personal data (even transiently — e.g., IP addresses, error logs containing patient names), they are processors and need DPAs too. If they process only anonymised/aggregated data, the obligation is lighter but still worth documenting.

**⚠️ Verify:** The Act requires processors to implement "reasonable security safeguards." What counts as "reasonable" will be clarified by rules or Board guidance. Ask your lawyer what contractual language is sufficient for a DPA under Indian law.

---

## 3. Consent Requirements

### 3.1 What a valid consent notice must include

Under Section 6 of the DPDP Act, consent must be **free, specific, informed, unconditional, and unambiguous with clear affirmative action.** For Care Bridge Home's app, this means:

1. **A notice (or privacy notice) must be given BEFORE or AT THE TIME of seeking consent.** It must describe:
   - What personal data will be collected
   - The **purpose** for which it is collected (be specific — "to coordinate your home care" is better than "to provide services")
   - The manner in which the data principal (patient/family) can exercise their rights (access, correction, erasure, grievance)
   - How to file a complaint with the Data Protection Board
2. **Consent must be obtained through an affirmative action** — a checkbox that is unchecked by default, a "Yes, I agree" button, or similar. Pre-ticked boxes, silence, or inaction do NOT count.
3. **Consent can be withdrawn at any time,** and the mechanism to withdraw must be as easy as the mechanism to give consent. The app must provide a simple way to revoke consent (e.g., a settings screen).
4. **Consent must be granular** — if you collect data for multiple purposes (care coordination, wellness tracking, research/analytics), you should seek separate consent for each purpose. A single blanket consent is risky.
5. **Proof of consent** — the fiduciary must be able to prove that consent was given. Log the timestamp, IP address, and the specific consent text shown when each user consented.

### 3.2 Consent for elderly patients / guardians

The DPDP Act specifically addresses:

- **Children (under 18):** A parent or lawful guardian must provide consent. The fiduciary must verify age and obtain verifiable parental consent. Processing that is likely to cause harm to a child is prohibited.
- **Persons with disability:** A lawful guardian can provide consent on their behalf.

**For elderly patients who are not legally incapacitated but need assistance:**
- The Act does not explicitly address this scenario. If the patient is mentally competent, they must consent themselves. A family member cannot legally consent *for* a competent adult.
- **Practical approach:** Build a "delegated access" or "family-linked account" feature where the patient consents to share their data with a named family member. The family member gets read access but the patient remains the consenting data principal. This is what your current "family members linked to a patient's record with read access" design already does — it's a good pattern.
- If a patient is genuinely unable to consent (e.g., advanced dementia), you need a lawful guardian — typically someone with a legal guardianship order or power of attorney. Document this.

### 3.3 Consent Managers

The Act introduces the concept of **Consent Managers** — entities registered with the Data Protection Board that act as intermediaries, helping individuals give, manage, review, and withdraw consent through an accessible platform. This is an **optional** mechanism. For a small app like Care Bridge Home, you can manage consent directly in-app without a Consent Manager. However, if the government mandates Consent Managers for health data in the future, you may need to integrate with one.

**⚠️ Verify:** The Consent Manager framework is still being developed. No Consent Managers have been registered yet as of mid-2026. Monitor this space.

---

## 4. Data Protection Officer / Grievance Officer Requirements

### 4.1 Significant Data Fiduciary (SDF) triggers

The Act requires **only Significant Data Fiduciaries** to appoint a Data Protection Officer (DPO). The government will notify thresholds for who qualifies as an SDF based on:
- Volume and sensitivity of personal data processed
- Risk of harm to data principals
- The fiduciary's turnover, scale of operations, etc.

**For Care Bridge Home (a small startup with a few hundred patients in two Kerala towns):** You are **unlikely** to be classified as an SDF on day one. However, if you scale to thousands of patients across multiple states, or if the government specifically designates health-data fiduciaries as SDFs regardless of size, this could change.

### 4.2 Grievance Officer (applies to ALL fiduciaries)

**Every Data Fiduciary, regardless of size, must appoint a Grievance Officer** (sometimes called a Grievance Redressal Officer). This person:
- Must be based in India
- Is the point of contact for data principals to file complaints about data handling
- Must acknowledge complaints within a prescribed period and resolve them within a prescribed period (timelines to be set by rules — ⚠️ verify current timelines)
- Their name and contact details must be published on the app/website

**For a small business:** This can be the founder/owner. No external hire is needed. Just designate someone, publish their contact info, and actually respond to complaints.

### 4.3 Independent Data Auditor (SDFs only)

Significant Data Fiduciaries must also appoint an independent data auditor to carry out periodic data audits. This does NOT apply to small fiduciaries.

**⚠️ Verify:** The SDF notification thresholds have not been published yet. Ask your lawyer whether any sector-specific SDF notifications cover health-data companies.

---

## 5. Data Retention and Deletion Obligations

The DPDP Act is principle-based rather than prescriptive on retention periods:

1. **You may keep personal data only as long as it is needed for the stated purpose.** Once the purpose is served, you must delete it.
2. **When a data principal withdraws consent,** you must stop processing and delete the data "within a reasonable time" unless retention is required by another law.
3. **The Act does not specify a fixed retention period for health data** (unlike, e.g., Indian medical records laws which may require hospitals to retain records for 3-5 years).

**For Care Bridge Home, practical retention questions:**

| Data type | Suggested retention approach |
|-----------|------------------------------|
| Active patient records (current patients) | Retain while the patient is receiving care + a reasonable period after discharge (e.g., 3-5 years for potential continuity of care, subject to consent) |
| Inactive/discharged patients who withdraw consent | Delete within a defined window (e.g., 30-90 days), unless a legal obligation requires retention |
| Vitals/health readings | Retain as part of the patient record while active; delete with the record |
| SOS/fall-alert location data | Delete after the alert is resolved (retain only if needed for incident documentation) |
| Auth/account data (email, password hash) | Retain until account deletion is requested |
| Audit logs (consent records, access logs) | Retain for the life of the patient record + limitation period for legal claims (typically 3 years) |

**⚠️ Verify:** The Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations and state-level clinical establishment rules may impose minimum retention periods for patient health records. These override the DPDP Act's deletion obligations. Ask your lawyer to reconcile DPDP deletion requirements with any health-record retention mandates.

**Implementation note:** Build a "delete patient data" function in your admin portal that cascades through all related records. Document your retention schedule in your privacy policy.

---

## 6. Data Breach Notification Requirements

The DPDP Act requires:

1. **Notify the Data Protection Board:** "Without delay" after becoming aware of a breach. The exact timeline will be prescribed by rules (draft rules suggested 72 hours, but ⚠️ this is not final).
2. **Notify affected data principals:** After the Board assesses the breach and directs notification, or as prescribed by rules. The notification must describe:
   - Nature and extent of the breach
   - What data was compromised
   - Likely consequences
   - Measures taken or proposed to be taken
   - Steps the data principal can take to protect themselves

**For Care Bridge Home, practical implications:**
- You need a **breach response plan** before going live. Even a one-page document covering: who detects, who decides, who notifies, and how.
- Supabase, Sentry, and Cloudflare should have contractual obligations to notify you of breaches affecting your data.
- A breach of health data (even if not legally "sensitive") will attract scrutiny. Have a plan.

**⚠️ Verify:** The final breach notification timeline and the Board's contact mechanism. As of mid-2026, the Board may not yet be operational. In the interim, you may still have obligations under the IT Act's SPDI Rules (which require breach notification to CERT-In).

---

## 7. Cross-Border Data Transfer Rules

**This is one area where the DPDP Act is more permissive than expected:**

- The Act does **NOT** require data to be stored only in India.
- It allows transfer of personal data to **any country** except those specifically **blacklisted** by the Central Government.
- As of mid-2026, no countries have been blacklisted.

**What this means for Care Bridge Home:**

| Service | Location | Assessment |
|---------|----------|------------|
| Supabase (Postgres) | Mumbai (ap-south-1) | ✅ Ideal — data stays in India. Simplifies compliance. |
| Sentry (error monitoring) | May process data outside India | ⚠️ Low risk if you configure Sentry to strip PII (patient names, phone numbers) from error payloads. Even if raw data transits outside India, it's not blacklisted. But document this in your DPA with Sentry. |
| Cloudflare CDN | Global edge network | ⚠️ CDN logs may contain IP addresses (which are personal data under DPDP). Transient processing at edge nodes outside India is likely low-risk, but document it. |

**Practical steps:**
- Supabase Mumbai is a strong choice — keep it.
- For Sentry: enable PII scrubbing in your SDK configuration. This reduces the risk to near-zero.
- For Cloudflare: review whether you can restrict edge processing to India-only nodes (Cloudflare offers this on some plans).
- Document all cross-border data flows in your privacy policy and in your records of processing.

**⚠️ Verify:** The government's blacklist of countries. Also, sector-specific rules (e.g., health data) could impose localization requirements even if the general DPDP Act does not. The earlier draft PDP Bill 2019 had strict localization for sensitive personal data; while the final Act dropped this, the government retains power to impose it by notification. Ask your lawyer.

---

## 8. Privacy Policy — Mandatory Content

Under the DPDP Act, every Data Fiduciary must publish a privacy policy (or "notice") that includes:

1. **What personal data is collected** — list the categories (names, DOB, phone numbers, addresses, medical conditions, vitals, location data, etc.)
2. **Purpose of processing** — for each category, state why you collect it (e.g., "Blood pressure readings are collected to monitor your cardiovascular health as part of your home care plan")
3. **How data principals can exercise their rights** — access, correction, erasure, grievance redressal
4. **How to file a complaint** with the Data Protection Board (once the Board is operational)
5. **Contact details of the Grievance Officer** — name, email, phone, postal address
6. **Data retention periods** or the criteria used to determine them
7. **Cross-border transfer details** — which countries data may be transferred to and why
8. **Consent withdrawal mechanism** — how a user can revoke consent
9. **Whether data is used for automated decision-making** (if applicable)
10. **Cookies/tracking** (if applicable — less relevant for a mobile app, but relevant for the web admin portal)

**⚠️ Verify:** The exact mandatory contents may be expanded by rules. Also, the privacy policy must be made available in **English and any Indian language** specified by the government (likely including Malayalam, given your user base in Kerala). Ask your lawyer whether a Malayalam translation is required.

---

## 9. Penalties for Non-Compliance

The DPDP Act has **substantial penalties**, but they are not automatic — the Data Protection Board imposes them after an inquiry. The Act specifies **maximum** penalties:

| Violation | Maximum Penalty |
|-----------|----------------|
| Failure to prevent a personal data breach | ₹250 crore |
| Failure to notify the Board / data principals of a breach | ₹200 crore |
| Non-compliance with obligations regarding children | ₹200 crore |
| Non-compliance with Significant Data Fiduciary obligations | ₹150 crore |
| Breach of consent / purpose limitation / other obligations | ₹50 crore |
| Failure to comply with Board directions | ₹50 crore |

**Realistic exposure for a small startup like Care Bridge Home:**
- The Board has discretion to impose penalties proportionate to the violation. A ₹250 crore penalty on a startup with ₹50 lakh revenue is unlikely — the Board would consider the nature, gravity, duration, and the fiduciary's size.
- **However**, even a ₹5-10 lakh penalty could be existential for a small business. And the reputational damage of a Board inquiry (which would be public) could be worse.
- The bigger risk is **civil liability** — data principals can sue for damages if they suffer harm from a breach. Health data breaches can cause real harm (discrimination, identity theft, medical fraud).

**Practical takeaway:** Compliance is not just about avoiding penalties — it's about avoiding the breach in the first place. Invest in security (encryption at rest, access controls, audit logging) and get your consent/notice documentation right. These are your best defences.

---

## 10. Step-by-Step Action Checklist (Priority Order)

### PHASE 1: Self-Service (Founder Can Do These)

| # | Action | Effort | Notes |
|---|--------|--------|-------|
| 1 | **Map your data flows.** List every piece of data you collect, where it's stored (Supabase tables), who has access (coordinators, family members, you), and where it goes (Sentry, Cloudflare, backups). | 1-2 days | Use a spreadsheet. This is the foundation for everything else. |
| 2 | **Draft a privacy policy.** Use the mandatory content list in Section 8 above. Be specific about health data. Publish it on your website and link it in the app. | 2-3 days | Start with a template (many Indian law firms publish free DPDP policy templates) and customise it. |
| 3 | **Implement in-app consent.** Before account creation, show the privacy policy and a checkbox: "I have read and agree to the Privacy Policy. I consent to Care Bridge Home collecting and processing my health data for home care coordination as described." Log the consent (timestamp, IP, version of policy shown). | 1-2 days dev | This is the single most important technical step. |
| 4 | **Add consent withdrawal.** Add a "Withdraw Consent" button in app settings. When clicked, confirm, then trigger data deletion workflow. | 1 day dev | |
| 5 | **Designate a Grievance Officer.** This can be you (the founder). Publish name, email, and phone in the privacy policy and in the app. | 1 hour | Actually monitor that inbox. |
| 6 | **Configure PII scrubbing in Sentry.** Strip patient names, phone numbers, and addresses from error payloads. | 1-2 hours dev | Sentry has built-in PII scrubbing. Turn it on. |
| 7 | **Write a one-page breach response plan.** Who detects a breach? Who decides it's a breach? Who notifies the Board? Who notifies users? What's the communication template? | 2-3 hours | Keep it simple. A checklist is fine. |
| 8 | **Set up data deletion capability.** Build an admin function to delete a patient's entire record (all related tables). Test it. | 1-2 days dev | This is needed for consent withdrawal and retention compliance. |
| 9 | **Document your retention schedule.** Decide how long each data category is kept and why. Write it down. | 2-3 hours | Use the table in Section 5 as a starting point. |

### PHASE 2: Needs a Lawyer / Consultant

| # | Action | Why You Need a Lawyer |
|---|--------|----------------------|
| 10 | **Legal review of privacy policy and consent language.** | A lawyer will check that your policy meets DPDP requirements, that your consent language is legally valid, and that you haven't made promises you can't keep. |
| 11 | **Data Processing Agreements (DPAs) with Supabase, Sentry, Cloudflare.** | A lawyer will draft or review DPAs that meet Indian law requirements. Supabase's standard DPA may be GDPR-focused; it may need Indian-law amendments. |
| 12 | **Check for health-record retention mandates.** | A lawyer will check whether the Indian Medical Council regulations, Kerala Clinical Establishments Act, or other laws require you to retain patient records for a minimum period (which may conflict with DPDP deletion obligations). |
| 13 | **Assess whether you need a Malayalam translation of the privacy policy.** | The Act allows the government to mandate Indian-language versions. A lawyer will advise whether this is currently required and, if so, draft or review the translation. |
| 14 | **Check whether any DPDP Rules or notifications have been issued since the Act was passed.** | As of mid-2026, many rules are still pending. A lawyer will have the latest status and can advise on which provisions are actually enforceable today vs. which are still waiting for notification. |
| 15 | **Review your breach response plan.** | A lawyer will check that your plan meets legal requirements and that your notification templates are appropriate. |
| 16 | **Employment/contractor agreements for coordinators.** | Coordinators who access patient data should have confidentiality and data-handling clauses in their contracts. A lawyer will draft these. |

### PHASE 3: Ongoing (After Launch)

| # | Action |
|---|--------|
| 17 | Monitor for DPDP Rules notifications — the Act's details are still being filled in. |
| 18 | Log and respond to all Grievance Officer complaints. |
| 19 | Review consent records annually — are your logs complete and accurate? |
| 20 | If you scale beyond a few hundred patients, re-assess whether you might be classified as a Significant Data Fiduciary. |
| 21 | If you add wearable device data, update your privacy policy and seek fresh consent. |

---

## Summary: What Matters Most for Care Bridge Home Right Now

1. **Get consent right.** This is the foundation of DPDP compliance. A clear privacy policy + an unchecked checkbox + a consent log = 80% of your compliance work done.
2. **Keep data in India.** Supabase Mumbai is already doing this. Minimise what leaves India (scrub PII from Sentry).
3. **Have a deletion plan.** Know how you'll delete data when a patient withdraws consent.
4. **Appoint a Grievance Officer.** It's you. Publish your contact info.
5. **Get a lawyer to review items 10-16 before launch.** The self-service items (1-9) will take you 80% of the way. The lawyer will catch the 20% that could get you in trouble.

---

## ⚠️ CRITICAL DISCLAIMER

This brief is a **research summary based on the text of the Digital Personal Data Protection Act, 2023 and publicly available draft rules as understood by an AI model with a knowledge cutoff.** It is NOT legal advice. The DPDP Act's enabling Rules, the constitution of the Data Protection Board, and sector-specific notifications are still evolving. Several provisions discussed above may not yet be enforceable, and others may change before enforcement begins.

**Before launching a health-data app in India, you MUST:**
- Engage a qualified Indian data-privacy lawyer or consultant
- Have them verify every section of this brief against the current legal position
- Have them review your privacy policy, consent mechanisms, and vendor contracts
- Confirm which provisions of the Act are currently in force vs. awaiting notification

**Recommended next step:** Share this brief with an Indian law firm with a TMT (Technology, Media, Telecom) or data-privacy practice. Firms like Trilegal, Shardul Amarchand Mangaldas, Nishith Desai Associates, or Ikigai Law have published DPDP guidance and can provide a fixed-fee compliance review for a startup.

---

*End of brief. Prepared August 2026.*
