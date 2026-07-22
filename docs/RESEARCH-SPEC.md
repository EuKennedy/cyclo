<!--
  Cyclo — Research & Engineering Specification
  Source of truth for the cycle model, prediction engine, data model, UX, and privacy stance.
  Generated from a verified deep-research pass (physiology, prediction, app-UX, privacy).
  Do not edit casually — this encodes clinically verified constants.
-->

# Cyclo — Build-Ready Product & Engineering Specification

A premium, local-first menstrual cycle tracking web app. Dark-first, editorial, motion-rich. Every number, formula, and rule below is derived from the verified clinical research and app-market teardown supplied. All predictions are statistical estimates from historical averages — never a contraceptive method.

---

## 0. Foundational Constants

These are the single source of truth. Store in one config module; never hardcode inline.

```
POP_MEAN_CYCLE     = 29     // population fallback when history is sparse (24–38 typical band)
DEFAULT_PERIOD_LEN = 5      // days of bleeding
LUTEAL_LEN         = 14     // default; per-user calibratable, clamp 9–17
FERTILE_LEAD       = 5      // days before ovulation (sperm survive up to ~5 days)
FERTILE_TAIL       = 0      // strict Wilcox 6-day window ending on ovulation day
PREDICT_WINDOW     = 6      // # of recent cycles to average (3–12 acceptable; 6 default)
MIN_DATA           = 2      // cycles required before showing a personalized prediction
SHRINK_K           = 3      // Bayesian prior strength (pseudo-cycles)
EWMA_ALPHA         = 0.5    // recency weight; higher = more reactive

NORMAL_CYCLE_RANGE = [21, 35]   // ACOG adult band (used for "consider a clinician" nudges)
ADOLESCENT_RANGE   = [21, 45]
PERIOD_LEN_RANGE   = [2, 8]
BIO_HARD_CLAMP     = [15, 60]   // wider clamp for outlier rejection only
```

Key clinical facts encoded throughout:
- Normal adult cycle length is a **range (~21–35 days)**, not a fixed 28. 28 is a median, not a rule.
- Cycle-length variability lives almost entirely in the **follicular phase (~10–16 days)**; the luteal phase is **relatively constant (~11–17, mean ~14)** but genuinely variable — this is the largest error source.
- Ovulation is estimated by counting **backward ~14 days from the next predicted period**, never forward from the last.
- The fertile window is **~6 days ending on ovulation day** (5 days before + ovulation day), because sperm survive up to ~5 days while the egg survives ~12–24 hours.

---

## 1. Cycle Model

### 1.1 The Four Phases

Day 1 = first day of bleeding. Given `C` = average cycle length, `L` = average period (bleeding) length, and ovulation cycle-day `ov_cd = C − LUTEAL_LEN`:

| Phase | Typical day range (28-day cycle) | General rule | Dominant hormones |
|---|---|---|---|
| **Menstrual** | Days 1–5 (`1 … L`) | Day 1 through the last bleeding day | Falling estradiol & progesterone |
| **Follicular** | Days 1–13 (`1 … ov_cd−1`, overlaps menses) | Day 1 until ovulation; absorbs cycle-length variation | Rising FSH then estradiol |
| **Ovulatory** | ~Day 14 (`ov_cd`, ±fertile band) | The ~24h ovulation event + surrounding fertile days | LH surge; estradiol peak |
| **Luteal** | Days 15–28 (`ov_cd+1 … C`) | Ovulation until next period; relatively stable ~14 days | Progesterone dominant |

Important: in a 32-day cycle ovulation lands near day 18, not 14; in a 21-day cycle near day 7. The app models phase boundaries **per user**, never on a fixed 28-day template. For product UX the four clinical phases are surfaced as **Menstrual → Follicular → Fertile/Ovulation → Luteal**, with the fertile window drawn as a distinct sub-band inside follicular/ovulatory.

### 1.2 Deterministic Computation Rules

All date math is done in **whole days at local midnight** (store dates, not timestamps) to avoid DST/off-by-one drift.

**(a) Current cycle day**
```
function currentCycleDay(lastPeriodStart, today):
    d = daysBetween(midnight(today), midnight(lastPeriodStart)) + 1
    if d < 1: return ERROR("start date is in the future")
    return d
```

**(b) Current phase** — segmented from `L`, `C`, and clamped ovulation day:
```
function currentPhase(cycleDay, C, L):
    ov_cd   = max(C - LUTEAL_LEN, L + 1)          // clamp so ovulation never overlaps menses
    fert_lo = max(ov_cd - FERTILE_LEAD, L + 1)
    fert_hi = ov_cd + FERTILE_TAIL

    if cycleDay > C:        return { phase: "LATE", lateBy: cycleDay - C }
    if cycleDay <= L:       return "MENSTRUATION"
    if cycleDay <  fert_lo: return "FOLLICULAR"
    if cycleDay <= fert_hi:
        return cycleDay == ov_cd ? "OVULATION (peak)" : "FERTILE WINDOW"
    return "LUTEAL"                                // fert_hi < cycleDay <= C
```

Edge cases (must handle explicitly):
- **LATE** (`cycleDay > C`): show "period is N days late" and prompt the user to confirm — a new period may have started unlogged. Never silently roll into a new cycle.
- **Very short cycles** where `C − 14 ≤ L`: the `max(…, L+1)` clamp prevents the fertile band overlapping bleeding.
- **New period logged** → becomes the new `lastPeriodStart`, cycle day resets to 1.

---

## 2. Prediction Engine

The whole pipeline is **pure functions over a sorted list of period-start dates**: `cycles[] → stats → predictedNextStart → ovulation → fertileWindow → phase`. Keep every constant configurable so the mean estimator can later be swapped for ARIMA/LSTM/Bayesian without touching downstream code.

### 2.1 Next N Period Start Dates (rolling average + shrinkage)

A cycle length is the whole-day gap between consecutive starts: `cycle[i] = days(start[i+1] − start[i])`.

```
function predictNextStart(starts):                 // sorted ascending
    cycles = [ days(starts[i+1] - starts[i]) for i in 0..len-2 ]
    if len(cycles) < MIN_DATA:
        avg = POP_MEAN_CYCLE                        // labeled clearly as an "estimate"
    else:
        recent = trimOutliers( last PREDICT_WINDOW of cycles )
        avg    = shrinkToPrior( weightedMean(recent), n = len(recent) )
    return starts[last] + round(avg)

function weightedMean(c):                           // c[0]=oldest ... c[k]=newest
    w_i = EWMA_ALPHA ^ (k - i)                       // newest counts most
    return sum(w_i * c_i) / sum(w_i)                 // equal weights = arithmetic mean

function trimOutliers(c):
    c = [x for x in c if BIO_HARD_CLAMP[0] <= x <= BIO_HARD_CLAMP[1]]
    m = mean(c); s = stdev(c)
    return [x for x in c if abs(x - m) <= 2*s]       // ~2 SD; use MAD for robustness

function shrinkToPrior(userAvg, n):                 // lean on population when data is thin
    return (n * userAvg + SHRINK_K * POP_MEAN_CYCLE) / (n + SHRINK_K)
```

**Rolling forecast of N future starts:** iterate — each predicted start becomes the anchor for the next, adding `round(avg)` each time. Confidence widens with each step out (see 2.4); do not present month-4 with the same certainty as month-1.

**Missed-log handling (most common real-world bug):** if an observed "cycle" is ≈2× the user's mean, it is likely two cycles with one un-logged period. Either split it (`divide by round(gap/mean)`) or exclude it before averaging.

### 2.2 Estimated Ovulation (backward-counting / luteal method)

```
function estimateOvulation(predictedNextStart):
    return predictedNextStart - LUTEAL_LEN          // a calendar date

function ovulationCycleDay(avgCycle):
    return max(avgCycle - LUTEAL_LEN, DEFAULT_PERIOD_LEN + 1)
```

**Per-user calibration:** if the user logs a positive LH test, BBT shift, or confirmed ovulation, set `LUTEAL_LEN_user = mean(days(nextPeriodStart − confirmedOvulation))`, clamped 9–17. This cuts the single largest error source. Surface the caveat: only ~14% of women with a 28-day cycle ovulate on day 14 (most common was day 16); ovulation is observed anywhere from ~day 11 to 20.

### 2.3 Fertile Window (Wilcox 6-day)

```
function fertileWindow(ovulationDate):
    return {
        start: ovulationDate - FERTILE_LEAD,        // 5 days before
        end:   ovulationDate + FERTILE_TAIL,        // 6-day window ending on ovulation
        peak:  ovulationDate                         // highest probability; ov-1 nearly equal
    }
```

Day-specific pregnancy probability is **not uniform**: ~0.10 five days out, rising to a peak (~0.27–0.34) in the ~2 days before and including ovulation, then dropping sharply. Surface a **probability gradient**, not a single "fertile day." For irregular users, widen the band to the plausible ovulation range:
```
fertileStart = (earliestPlausibleNextPeriod - LUTEAL_LEN) - FERTILE_LEAD
fertileEnd   = (latestPlausibleNextPeriod   - LUTEAL_LEN) + FERTILE_TAIL
```
Draw this as a lower-confidence shaded band.

### 2.4 Variability & Confidence

```
function cycleStats(cycles):                        // last up to 12, outlier-trimmed
    return { mean, sd: sampleStdev(cycles), rng: max-min, cv: sd/mean, n }

function predictedRange(predictedStart, sd, z = 1.96):
    return { earliest: predictedStart - round(z*sd), latest: predictedStart + round(z*sd) }

function confidence(s):
    if s.n < 3:                    return "LOW (insufficient history)"
    if s.rng > 9 or s.sd > 7:      return "IRREGULAR / VERY LOW"
    if s.sd <= 1.5:                return "VERY HIGH"
    if s.sd <= 3:                  return "HIGH"
    if s.sd <= 5:                  return "MODERATE"
    return "LOW"

function isIrregular(s):
    return s.rng > 9 or s.mean < 21 or s.mean > 38
```

Behavior driven by these fields (both first-class, exposed at the model layer):
- With `< MIN_DATA` cycles, show population defaults with an explicit **"estimate"** label.
- When **IRREGULAR**, widen displayed period/fertile bands to the prediction interval, lower shrinkage `K` so the model stays reactive, and **never render a false-precision single day**.
- ~68% of outcomes fall within ±1 SD, ~95% within ±1.96 SD (Normal approximation). Prefer **median + MAD** over mean + SD when a single outlier month would distort.

### 2.5 Non-Contraception Disclaimer (enforced at the model layer, not just UI)

This is a hard requirement, carried by any surface that consumes a prediction:
- **Never** compute, expose, or label a "safe day" concept. There is no `isSafe` field anywhere in the codebase.
- Fertile/ovulation output is always a **probability band + confidence tier**, never a guaranteed single day.
- A persistent, plain-language notice states the app **does not prevent pregnancy** and is **not a substitute for a contraceptive method or medical advice**.
- Copy distinguishes explicitly between an **estimate** (calendar prediction) and a **measurement** (LH/BBT). Actual ovulation shifts cycle-to-cycle from stress, illness, travel, PCOS, perimenopause, breastfeeding; the true window can fall outside the predicted band.
- Users seeking to prevent or achieve pregnancy are directed to validated methods taught by professionals and/or clinical care.

Gentle, non-diagnostic "consider seeing a clinician" nudges fire when: mean cycle < 21 or > 35–38, period > 7–8 days, sustained cycle-to-cycle range > 9 days, no period for ~90 days, or previously-regular cycles become irregular.

---

## 3. Symptom & Phase Guidance

Per-phase energy/mood/needs summaries, delivered in a **confident, validating, editorial, non-clinical** voice — never diagnostic, never prescriptive, never pink-and-cutesy. The tone frames the cycle as a personal vital sign ("normal is relative to *your* baseline"), dispelling the 28-day myth.

| Phase | Energy | Mood tendency | Common needs / what tends to help |
|---|---|---|---|
| **Menstrual** (days 1–~5) | Lowest; inward | Reflective, tender, low tolerance for overstimulation | Rest, warmth, gentle movement, iron-rich food, permission to slow down |
| **Follicular** (post-bleed → pre-ovulation) | Rising, expansive | Optimistic, curious, motivated | Channel momentum: start projects, plan, socialize, higher-intensity movement |
| **Ovulatory** (~mid-cycle) | Peak | Confident, communicative, high libido | Front-load demanding work and social plans; hydration; note fertile signs |
| **Luteal** (post-ovulation → pre-period) | Tapering | Focused early, then more sensitive; possible irritability, cravings, bloating as period nears | Steady routines, magnesium/complex carbs, boundaries, wind-down; self-compassion |

**Copy tone rules:**
- **Validate, don't diagnose.** "Lower energy around your period is common and expected" — not "you have low energy."
- **Second person, warm, plain language.** No jargon walls; link inline to science-referenced "Learn more" at the point of curiosity (Clue pattern), never generic content spam.
- **Optional, never alarmist.** Symptoms are patterns to notice, not problems to fix. Reserve clinical language exclusively for the gentle "consider a clinician" nudges.
- **Inclusive & genderless** by default — no assumptions about gender identity or goals. This is a deliberate design stance, not a nicety.

---

## 4. Data Model (IndexedDB, local-first)

Device is the source of truth. All entities live in IndexedDB object stores. No account, no network required for full functionality. Dates stored as `YYYY-MM-DD` strings (local midnight), not timestamps.

### `settings` (single object, key = `"user"`)
```
{
  id: "user",
  avgCycleLength: number | null,      // null until computed from history
  avgPeriodLength: number,            // default 5
  lutealLengthOverride: number | null,// per-user calibrated, else null → use 14
  lifeStage: "adolescent" | "adult" | "perimenopause",
  goal: "track" | "conceive" | "understand",   // never "prevent" (not a contraceptive)
  cycleRangeStandard: "ACOG_21_35" | "FIGO_24_38",
  notifications: {
    periodReminder: bool,             // decoupled per-category (no forced coupling)
    fertileWindow: bool,
    logReminder: bool,
    educationalContent: bool          // independently mutable
  },
  privacy: { pinEnabled: bool, biometricEnabled: bool, decoyScreenEnabled: bool },
  createdAt, updatedAt
}
```

### `cycles` (one record per completed/active cycle)
```
{
  id: uuid,
  startDate: "YYYY-MM-DD",            // day 1 (indexed)
  endDate: "YYYY-MM-DD" | null,       // = next cycle's startDate - 1; null while active
  lengthDays: number | null,          // computed on close
  periodLengthDays: number | null,
  isPredicted: bool,                  // predicted vs. actually logged
  ovulationConfirmed: bool,           // via LH/BBT log
  confirmedOvulationDate: "YYYY-MM-DD" | null,
  notes: string | null,
  createdAt, updatedAt
}
```
Index: `startDate` (for sorted retrieval powering the whole prediction pipeline).

### `periodLogs` (per bleeding-day record)
```
{
  id: uuid,
  date: "YYYY-MM-DD",                 // indexed, unique per day
  cycleId: uuid,
  flow: "spotting" | "light" | "medium" | "heavy",
  isStartDay: bool,
  createdAt, updatedAt
}
```

### `dailySymptomLogs` (per-day symptom/mood entry)
```
{
  id: uuid,
  date: "YYYY-MM-DD",                 // indexed, unique per day
  cycleId: uuid,
  cycleDay: number,                   // denormalized for fast phase correlation
  mood: string[],                     // multi-select
  energy: 1..5 | null,
  symptoms: [ { type: string, intensity: 1..3 } ],  // slider-captured
  sexualActivity: { logged: bool, protected: bool | null } | null,
  bbt: number | null,                 // basal body temp, °C — measurement, for calibration
  lhTest: "positive" | "negative" | null,
  notes: string | null,
  createdAt, updatedAt
}
```

Design notes: `cycleDay` is denormalized onto symptom logs so phase-correlation views are O(n) without recomputation. `bbt` and `lhTest` are **measurements** (feed ovulation calibration); everything else is subjective logging. Hard-delete is a true purge across all stores, never a soft-delete flag.

---

## 5. Feature Set (prioritized)

### v1 — Core (P0)
- **Circular cycle-position ring** as the app's spatial spine (see §6) — home visualization, unmistakably Cyclo.
- Log **period start/end + flow** in one fast flow.
- **Current cycle day + current phase** at a glance.
- **Next-period prediction** with confidence tier and a range (not a bare date).
- **Estimated ovulation + fertile window** as a probability band, with the enforced non-contraception disclaimer.
- **One-gesture daily logging** (tap icon → intensity slider) for mood/energy/symptoms.
- **Calendar view** in the same visual language as the ring (Apple-style shape+fill+color semantics).
- **Onboarding quiz** that visibly improves day-one predictions (~10–15 focused steps).
- **Local-first storage, no account, offline-complete.** PIN/biometric lock. One-tap export + true hard-delete.
- Per-phase guidance copy and gentle clinical-threshold nudges.

### v1.1 — Fast follow (P1)
- Per-user **luteal-length calibration** from LH/BBT logs.
- **Symptom↔phase correlation** insights (which symptoms cluster where).
- **Passive sensor integration** (Apple Watch / Oura wrist-temperature, heart rate) for retrospective ovulation and better forecasts.
- **Decoy screen** + scheduled auto-wipe (coercion-resistant safeguards).
- Inline, science-referenced **"Learn more"** education at point of curiosity.

### Later (P2)
- Opt-in **client-side end-to-end encrypted sync/backup** (user-held keys, server holds only ciphertext).
- **Editorial daily insights** in a confident narrative voice.
- Customizable tracking views + app icon (delight, not a monetization gate).
- Swap mean estimator for **ARIMA / LSTM / hierarchical-Bayesian** model for irregular trackers.
- **Soft paywall** placed only *after* demonstrated value (7-day trial, easy dismiss, honest social proof) — never a hard upfront gate.

---

## 6. UX & Motion Patterns (Apple-grade, dark-first)

### Patterns to adopt
- **A distinctive circular cycle ring as the spatial spine (P0).** Fuse Clue's "where am I on this journey" Cycle View with a committed thematic dial (à la Stardust's moon-mapped wheel). The metaphor must appear in the home visualization, the calendar, *and* the logging surface so it is un-clonable. Test against the standard: *if it could belong to any product, it failed.*
- **Precise shape + fill + color semantics (Apple).** Solid = logged; light/outline = predicted; distinct ovals for fertile window vs. ovulation day; dots for symptoms. Glanceability from unambiguous encoding, not ornament. Ensure **colorblind-safe** distinction (never rely on hue alone).
- **Ruthless information hierarchy — one primary truth per screen.** Collapse the daily state to one glanceable, action-oriented answer (the clarity of Natural Cycles' single status), layered above optional depth the user taps into.
- **Logging as a delightful micro-interaction, not a form.** Tap icon → slider for intensity, with immediate motion feedback. Support a dual-surface split: fast glance-log vs. in-depth log.
- **Onboarding that earns trust before it asks.** A focused quiz that visibly sharpens day-one predictions, with signature moments of motion (e.g., an animated, interactive birthday/zodiac picker). Well under 15 screens; each must earn its place.
- **Predictions displayed as ranges with confidence**, and a countdown (`daysUntilNextPeriod`) for the anchoring "when" question.
- **Cinematic motion at 60fps.** Scrubber/slider to explore the cycle across the month; motion is the brand, but performance discipline is non-negotiable.
- **Per-category notification control.** Period reminder ≠ fertile alert ≠ educational content — each independently mutable.

### Anti-patterns to avoid
- **Marathon onboarding** (Flo's ~70 screens / 7 minutes, disappearing progress bar).
- **Hard upfront/end-of-funnel paywall** with a hidden or delayed close button.
- **Coupled, un-mutable notifications** — e.g., content pings you can't silence without losing the period reminders you actually want.
- **Pastel-pink / clinical-white defaults and gendered framing** — reads as the safe, templated option. Commit to dark-first, editorial, inclusive.
- **A generic month grid bolted onto a paywall** with no distinctive metaphor.
- **Motion without performance or privacy engineering** — loading lag, glitches, and hidden third-party data flows collapse the premium illusion instantly (Stardust's documented failure).
- **False precision** — a single "fertile day" or "safe day" for any user, especially irregular ones.

---

## 7. Privacy Stance

Reproductive-health data is among the most sensitive a consumer app can hold, and post-*Dobbs* (June 2022) it is legally weaponizable in the US: cycle dates, missed periods, sexual-activity logs and pregnancy status can become evidence. Most period apps fall **outside HIPAA** (it governs providers/insurers, not direct-to-consumer apps), so the legal floor is low and enforcement risk is real — the FTC's Flo order, the combined $56M Google/Flo settlement, and the August 2025 jury verdict finding Meta liable under California privacy law all trace to embedded ad/analytics SDKs exfiltrating health data. Mozilla flagged 18 of 25 reproductive apps; the only "Best Of" was **Euki — local-only, no backend**. Local-first converts privacy from a revocable promise into a property of the system: data that never leaves the device cannot be subpoenaed from a server, breached from a cloud, sold by a broker, or siphoned by an ad SDK.

### Concrete requirements
1. **Local-first by default.** The device is the source of truth; the cloud is at most an opt-in encrypted relay. This is the single highest-leverage decision.
2. **Full functionality with no account and no network** — no sign-up, email, phone number, device ID, or advertising ID (IDFA/GAID) collection. Core tracking works fully offline and anonymously.
3. **Hard data minimization** — collect only fields the invoked feature strictly needs; never infer or derive beyond what the user explicitly logs ("strictly necessary" standard, mirroring the My Body, My Data Act).
4. **Zero third-party trackers, ad, attribution, crash, or hosted-analytics SDKs** on any surface touching health data. If product metrics are needed, use self-hosted, aggregate-only, identifier-free telemetry with no health-linked events.
5. **If sync/backup is offered: opt-in, client-side end-to-end encrypted, user-held keys** (derived from a passcode/secret, never escrowed server-side). The server stores only ciphertext it cannot decrypt — nothing readable to disclose under legal compulsion.
6. **One-tap export + true hard-delete** — a real purge of local and any synced copies (not a soft-delete flag), plus optional scheduled auto-wipe.
7. **Coercion-resistant safeguards** — PIN/biometric lock, optional decoy/fake screen, quick-erase. The threat model includes device seizure and coerced unlocking, not just remote attackers.
8. **Radical, plain-language transparency** — a short, readable disclosure of exactly what is stored, that it stays on-device, that nothing leaves the device, and an explicit law-enforcement stance. No policies buried in ToS.
9. **Treat HIPAA as inapplicable and insufficient** — design to the stricter privacy-by-design bar regardless.
10. **"Nothing to disclose" posture** — architect so that, faced with a valid legal request, the honest answer is that the operator holds no readable reproductive-health data. Note that local-only mitigates third-party sharing but does not eliminate physical device seizure — pair it with the lock/decoy/wipe safeguards above.

---

## Appendix A — Independently Verified Clinical Claims

_Each claim below was fact-checked by a separate research agent against authoritative medical/legal sources._

### A normal adult menstrual cycle length is a range of roughly 21-35 days, not a fixed 28 days.

**Verdict:** supported

The claim is accurate and reflects standard clinical guidance. The 28-day figure is an average/typical value, not a fixed norm — actual healthy cycles vary considerably. The most widely cited clinical range is 21-35 days: the UK NHS states "Regular cycles that are longer or shorter than this [28 days], from 21 to 35 days, are normal," and ACOG uses ~21-34/35 days as the adult range (noting 60-80% of adolescent cycles fall in 21-34 days by the third year post-menarche). One nuance worth flagging: newer international terminology from FIGO (2011, and used in ACOG's abnormal-uterine-bleeding evaluation via System 1/PALM-COEIN) defines normal cycle frequency slightly more narrowly as 24-38 days, based on the 5th-95th percentiles of large population studies in those aged 18-45. So the exact numeric bounds differ by source (classic textbook 21-35 vs. contemporary FIGO 24-38), but the claim's central assertion — that "normal" is a range and 28 days is not a fixed requirement — is correct and well supported. Note also this applies to adults; cycles are commonly longer and more variable in the first few years after menarche and in perimenopause.

**Sources:**
- https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/
- https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign
- https://www.acog.org/womens-health/faqs/abnormal-uterine-bleeding
- https://obgyn.onlinelibrary.wiley.com/doi/full/10.1002/ijgo.14946
- https://www.ncbi.nlm.nih.gov/books/NBK532913/
- https://my.clevelandclinic.org/health/articles/10132-menstrual-cycle

### Ovulation is best estimated as occurring about 12-14 days before the NEXT period (relatively constant luteal phase), rather than always on cycle day 14.

**Verdict:** nuanced

The claim's core logic is correct and reflects mainstream clinical teaching: because cycle-length variation comes mostly from the follicular (pre-ovulatory) phase while the luteal (post-ovulatory) phase is comparatively stable, counting backward ~14 days from the next menstruation estimates ovulation better than the fixed "day 14" rule. Day 14 only applies to an idealized 28-day cycle (28 - 14 = 14); in a 32-day cycle ovulation is closer to day 18, and most people ovulate anywhere from roughly day 8-21. Standard physiology texts state the luteal phase is "relatively constant... with a duration of 14 days," while the follicular phase ranges ~10-16+ days. Two important nuances: (1) "Relatively constant" is not "fixed." Recent higher-quality evidence shows meaningful within-woman and between-woman luteal-phase variability — a 2024 prospective study (Prior et al., Human Reproduction) found many healthy, regularly-menstruating women had at least one short luteal phase (<10 days), and other data cite luteal lengths spanning roughly 7-19 days (typical/normal ~11-17, mean ~14). So the luteal phase is more stable than the follicular phase but is genuinely variable, and the tighter "12-14 day" window is an approximation of the average rather than a true constant. (2) The method is inherently retrospective: you can only count back from the next period once you know when it arrives, so in an irregular cycle it does not let you predict ovulation prospectively. Bottom line: the claim is directionally accurate and superior to the day-14 assumption, but the luteal phase should be described as relatively (not perfectly) constant, and "~14 days before the next period" is a useful estimate, not a fixed rule.

**Sources:**
- https://www.ncbi.nlm.nih.gov/books/NBK279054/ (Endotext, 'The Normal Menstrual Cycle and the Control of Ovulation' — luteal phase 'relatively constant... duration of 14 days'; follicular phase variable 10-16 days)
- Henry S, Shirin S, Goshtasebi A, Prior JC. 'Prospective 1-year assessment of within-woman variability of follicular and luteal phase lengths in healthy women...' Human Reproduction, 2024. DOI: 10.1093/humrep/deae215 (luteal phase NOT fixed; 55% of women had >=1 short luteal cycle)
- https://www.sciencedaily.com/releases/2024/10/241007134019.htm (summary of the 2024 Human Reproduction study on luteal-phase variability)
- https://en.wikipedia.org/wiki/Luteal_phase (luteal phase typically ~11-17 days; range reported 7-19 in some data; variability within and between women)
- ACOG-referenced fertile window: a person with a 26-32 day cycle is most fertile roughly days 8-19, illustrating ovulation is not fixed on day 14

### The fertile window is roughly the 5 days before ovulation plus the day of ovulation (about 6 days total), because sperm can survive up to ~5 days.

**Verdict:** supported

The claim is accurate and matches the foundational research and clinical guidance. Wilcox, Weinberg & Baird (1995, NEJM) — the landmark study defining the fertile window — found conception occurred only when intercourse fell within a six-day window that ENDED on the estimated day of ovulation (i.e., the 5 days before ovulation plus ovulation day). ACOG likewise states sperm can survive up to ~5 days in the reproductive tract, which sets the leading edge of the window, while the egg's ~24-hour lifespan sets the trailing edge. The stated mechanism is correct. Precise nuances that refine (but do not contradict) the claim: (1) '~5 days' is an UPPER bound achieved only under favorable, fertile-quality cervical mucus around ovulation; typical sperm survival is shorter (often 1-2 days). The claim's wording 'up to ~5 days' correctly captures this. (2) Some clinical sources (including ACOG) phrase the window as '5 days before to 1 day AFTER ovulation' to account for the egg's post-ovulation lifespan; however, Wilcox observed essentially no conceptions from intercourse the day after ovulation, so the practical, evidence-based window ends on the day of ovulation — consistent with the '6 days' figure. (3) Pregnancy probability is NOT uniform across the six days: it is low at the far edge (~10% per-cycle on day -5), peaks in the ~2 days before ovulation (~27-33%), and is lower again on ovulation day itself. The claim does not assert uniformity, so this is a clarification rather than a correction.

**Sources:**
- Wilcox AJ, Weinberg CR, Baird DD. Timing of Sexual Intercourse in Relation to Ovulation. N Engl J Med. 1995;333:1517-1521. https://www.nejm.org/doi/full/10.1056/NEJM199512073332301
- American College of Obstetricians and Gynecologists (ACOG) — Fertility Awareness-Based Methods of Family Planning / patient guidance on the fertile window and sperm survival (up to ~5 days). https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning
- FACTS About Fertility summary of Wilcox et al. 1995 (six-day fertile window ending on day of ovulation). https://www.factsaboutfertility.org/research/timing-of-sexual-intercourse-in-relation-to-ovulation-effects-on-the-probability-of-conception-survival-of-the-pregnancy-and-sex-of-the-baby/

### Calendar/app-based cycle and fertility predictions are estimates and are NOT a reliable form of contraception on their own.

**Verdict:** supported

Authoritative medical sources back this claim. Cleveland Clinic states the calendar/rhythm method is only about 75% effective and that "when used alone, it's not a very reliable form of contraception." ACOG says it does not advocate menstrual-cycle-tracking apps as a primary tool to prevent pregnancy. The NHS notes that fertility-tracking apps are "none officially recommended by the NHS," and that fertility awareness overall is only ~76% effective with typical/imperfect use (about 24 in 100 users pregnant per year), versus 91-99% only with perfect, consistent use taught by a trained practitioner. The CDC groups calendar-based fertility-awareness methods at roughly a 24% typical-use annual failure rate — far worse than IUDs or implants (under 1%). Two precision points/nuances: (1) The word "estimates" is apt for pure period-prediction apps (e.g., Flo, Clue, Apple Health), which forecast fertile windows from past-cycle data and are explicitly NOT contraceptives. (2) A narrow exception exists: some FDA-cleared apps (e.g., Natural Cycles) are authorized as contraception, but they are not mere calendar estimates — they require daily basal body temperature (and sometimes LH) measurement, and even then carry a ~6-8% typical-use failure rate and are not suitable for everyone (irregular cycles, shift work, illness reduce accuracy). So the claim holds strongly for calendar-only and prediction-only apps; the only caveat is that a small set of measurement-based, FDA-cleared apps can function as contraception when used rigorously, though still less reliably than long-acting methods.

**Sources:**
- https://my.clevelandclinic.org/health/articles/17900-rhythm-method
- https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/
- https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning
- https://www.nhsinform.scot/healthy-living/contraception/natural-family-planning-fertility-awareness/

### Period-tracking apps have faced documented privacy concerns about sharing or selling reproductive health data, which is a core argument for local-first, on-device storage.

**Verdict:** supported

The claim is well-supported by authoritative regulatory and advocacy sources, with one small precision note.

DOCUMENTED PRIVACY CONCERNS (strongly supported): These are not merely alleged but the subject of formal U.S. Federal Trade Commission enforcement. (1) Flo Health: In Jan 2021 the FTC charged, and in June 2021 finalized an order against, the maker of the Flo Period & Ovulation Tracker (100M+ users) for sharing sensitive health data (menstrual cycles, pregnancy intent) with Facebook, Google, and other analytics/marketing firms despite promising privacy. (2) Premom/Easy Healthcare: In May 2023 the FTC charged the ovulation-tracker Premom with disclosing users' sensitive reproductive health data to Google and AppsFlyer, and sharing personal data with two China-based firms, in violation of the Health Breach Notification Rule; a $100,000 penalty and ban on sharing health data for advertising were proposed. Post-Dobbs (2022), academic, journalistic, and civil-liberties sources (EFF, Privacy International, university analyses) further documented the risk that such data could be sought by law enforcement, since most period apps are not covered by HIPAA and fall under the third-party doctrine.

LOCAL-FIRST AS A CORE ARGUMENT (supported): Privacy advocates explicitly cite on-device/local storage as the primary mitigation. The Mozilla Foundation, EFF, Consumer Reports, and app makers themselves point to apps like Euki and Drip that store data only on the device with no cloud back-end or third-party trackers precisely to avoid the sharing/selling and third-party-disclosure risks. So local-first storage is a genuine, widely-cited response to these concerns.

MINOR PRECISION NUANCE ("sharing OR selling"): The strongest documented cases (Flo, Premom, and the related GoodRx action) involve unauthorized DISCLOSURE/SHARING of data with advertising and analytics partners rather than outright "sale" in the narrow sense. Broader data-broker selling of health/location data is also documented but is less central to the flagship enforcement cases. Because the claim uses the disjunction "sharing or selling," the well-documented sharing conduct satisfies it. A second caveat worth noting: local-only storage mitigates third-party sharing but does not eliminate every risk (e.g., a seized device can still be examined), so it is a strong but not absolute protection. Neither caveat undercuts the claim as stated.

**Sources:**
- https://www.ftc.gov/news-events/news/press-releases/2021/06/ftc-finalizes-order-flo-health-fertility-tracking-app-shared-sensitive-health-data-facebook-google
- https://www.ftc.gov/news-events/news/press-releases/2021/01/developer-popular-womens-fertility-tracking-app-settles-ftc-allegations-it-misled-consumers-about
- https://www.ftc.gov/news-events/news/press-releases/2023/05/ovulation-tracking-app-premom-will-be-barred-sharing-health-data-advertising-under-proposed-ftc
- https://www.ftc.gov/business-guidance/blog/2023/05/ftc-says-premom-shared-users-highly-sensitive-reproductive-health-data-can-it-get-more-personal
- https://www.eff.org/deeplinks/2022/06/should-you-really-delete-your-period-tracking-app
- https://arxiv.org/html/2404.05876v1
- https://stateline.org/2024/07/26/data-privacy-after-dobbs-is-period-tracking-safe/
- https://time.news/euki-app-offers-rare-privacy-first-alternative-to-data-sharing-period-trackers/

