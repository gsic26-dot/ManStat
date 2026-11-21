# ManStat: Architectural Standards & Iron Laws

This document governs all architectural decisions, code contributions, and automated agent workflows for **ManStat**. Every engineer and AI agent operating on this repository must strictly comply with these Iron Laws without exception.

---

## 1. The 5 Iron Laws of ManStat

### Law 1: ZERO GAS (Google Apps Script Ban)
- **Zero GAS Artifacts:** Absolutely no Google Apps Script code, APIs, or configuration files are permitted anywhere in the repository.
- **Forbidden Symbols & Patterns:**
  - Legacy GAS client-side RPC (`run`)
  - `HtmlService`
  - Legacy bus/storage: `window.LeaveBus`, `document.write()`
  - Template includes: `<?!= include(...) ?>`, `<? ... ?>`
  - Clasp files: `.clasp.json`, `appsscript.json`, `*.gs`
- **Modern Replacement:** Native TypeScript Web Application using standard fetch / REST / RPC endpoints powered by the official `@supabase/supabase-js` and `@supabase/ssr` SDKs.

### Law 2: STRICT TYPING (TypeScript Strict Mode)
- **100% TypeScript:** The entire codebase must be authored in TypeScript with `"strict": true` and `"noImplicitAny": true` enforced in `tsconfig.json`.
- **No Unjustified `any`:** `any` is strictly prohibited unless interfacing with untyped legacy raw payloads during migration, in which case `unknown` must be used with type narrowing/guards.
- **Supabase Generated Types:** All database entity models must derive directly from `src/types/database.types.ts` generated from the live Supabase schema.

### Law 3: THAI OBEC & CIVIL SERVICE LAW COMPLIANCE
All core domain calculations must reside in `/src/lib/regulations/` as pure, deterministic, unit-tested functions:

#### 1. Official Civil Service Retirement (พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 ม.19)
- **The October 1 Rule:** An officer born on October 1 retires on September 30 of the fiscal year they reach age 60.
- **The October 2+ Extension:** Only officers born between October 2 and December 31 extend their retirement fiscal year by +1 year.
- **Mandatory Logic:**
  ```typescript
  const isBornAfterOct1 = (birthMonth === 10 && birthDay >= 2) || birthMonth > 10;
  const retireFiscalYearCE = birthYearCE + 60 + (isBornAfterOct1 ? 1 : 0);
  const retireFiscalYearBE = retireFiscalYearCE + 543;
  ```
- Calculate remaining civil service tenure in precise Years, Months, and Days.

#### 2. Civil Service Leave Regulations (ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555)
- **Working Days vs. Calendar Days:**
  - *Working Days (วันทำการ):* Sick leave, personal leave, vacation leave, and short study leave. Excludes Saturdays, Sundays, and dates present in the `holidays` table.
  - *Calendar Days (วันปฏิทิน):* Maternity leave (ลาคลอดบุตร 90 วันปฏิทิน), ordination (อุปสมบท), military draft (ตรวจเลือก/เตรียมพล). Counted continuously.
  - *Half-Day Support:* Support half-day leave increments (`0.5` days: morning or afternoon).
- **Quota & Rules:**
  - Sick Leave (ลาป่วย): 60 working days/fiscal year. Medical certificate warning required when consecutive leave reaches 30 days or institutional policy threshold.
  - Personal Leave (ลากิจส่วนตัว): 45 working days/fiscal year. Newly appointed officers in their first fiscal year are capped at 15 working days.
  - Paternity Assistance Leave (ลาช่วยภริยาคลอดบุตร): 15 working days within 90 calendar days from the date of child delivery.

#### 3. Salary Increment & Performance Evaluation (ก.ค.ศ. ว15/2561)
- **Evaluation Cycles:**
  - Round 1 (รอบที่ 1): 1 October – 31 March
  - Round 2 (รอบที่ 2): 1 April – 30 September
- **Warning Thresholds:**
  - Flag alert when `leave_count > 6` times per evaluation cycle.
  - Flag alert when combined sick and personal leave `sick_personal_days > 23` working days per evaluation cycle.

### Law 4: PDPA & SECURITY SHIELD
- **Row Level Security (RLS):** Every database table must have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- **Supabase Auth Exclusively:** Authentication must rely solely on Supabase Auth.
- **Sensitive Data Isolation (`staff_sensitive`):**
  - Citizen ID (เลขบัตรประชาชน 13 หลัก) and Salary (เงินเดือน) must be isolated into a dedicated `staff_sensitive` table with strict RLS policies.
- **Citizen ID Masking & Auto-Remask:**
  - Default display: `1-xxxx-xxxxx-xx-x` (or masked according to standard).
  - Unmask action: Authorized personnel click reveal; data fetched via server action/RPC, logged in `audit_logs`, and auto-remasked on the client within 15 seconds.
- **Audit Logging:** Every view of sensitive data, approval of leave, or critical modification must record an entry in `audit_logs`.
- **Inactivity Guard:** Auto-logout modal appears after 44 minutes of inactivity, terminating session at 45 minutes on shared school computers.

### Law 5: VERIFICATION GATE
- **Continuous Compilation:** Every phase must pass:
  - `npm run typecheck` (0 errors)
  - `npm run build` (0 errors)
- No phase can be marked complete until both commands exit with code 0.

---

## 2. Directory Structure Standard

```
/
├── .env.example                # Template for environment variables (tracked)
├── .env                        # Secret credentials (IGNORED in .gitignore)
├── .gitignore                  # Git ignore rules
├── AGENTS.md                   # This document
├── package.json
├── tsconfig.json               # TypeScript strict configuration
├── supabase/
│   └── migrations/             # Versioned SQL migrations
│       └── 001_init_manstat_schema.sql
├── src/
│   ├── lib/
│   │   ├── supabase/           # Supabase client, server, and middleware utilities
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   └── regulations/        # Pure legal computation engine
│   │       ├── retirement.ts   # Sec. 19 retirement calculation
│   │       ├── leave-rules.ts  # PM Office 2555 leave calculations
│   │       ├── khurusapha.ts   # Professional teacher license rules
│   │       └── salary-eval.ts  # OPSC ว15/2561 evaluation rules
│   ├── types/
│   │   └── database.types.ts   # Supabase DB generated TypeScript definitions
│   └── tests/                  # Unit tests for regulations and critical paths
└── public/
    └── favicon.ico
```

---

## 3. Security Checkpoint Checklist

- [ ] `.env`, `.env.local`, `.vercel`, `node_modules` strictly ignored in `.gitignore`.
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` ever exposed in client-side code.
- [ ] All database queries filtered through Supabase Auth context with active RLS.
- [ ] All UI icons conform strictly to Pure Lucide SVG (Zero-Emoji policy).
