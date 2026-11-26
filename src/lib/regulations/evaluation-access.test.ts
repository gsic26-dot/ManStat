import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeAutoUnlockDateStr,
  formatThaiDateArabic,
  getBangkokDateString,
  isStaffManuallyUnlocked,
  resolveEvaluationAccess,
  shouldRequireEvaluationAgreement,
  type EvaluationAccessPeriod,
} from './evaluation-access';

describe('Hybrid Evaluation Unlock System (Auto 15-Day Window + Global + Per-User Override)', () => {
  const round1: EvaluationAccessPeriod = {
    id: 'fp-2570-r1',
    roundNo: 1,
    fiscalYearTh: 2570,
    evalEnd: '2027-03-31',
    isLocked: false,
    evaluationStatus: 'auto',
    autoUnlockDays: 15,
    unlockedStaffIds: [],
  };

  const round2: EvaluationAccessPeriod = {
    id: 'fp-2570-r2',
    roundNo: 2,
    fiscalYearTh: 2570,
    evalEnd: '2027-09-30',
    isLocked: false,
    evaluationStatus: 'auto',
    autoUnlockDays: 15,
    unlockedStaffIds: [],
  };

  describe('1. Auto-Unlock Date Calculation & Thai Arabic Formatting', () => {
    it('calculates auto-unlock date 15 days before Round 1 end (31 March -> 16 March)', () => {
      const unlockDate = computeAutoUnlockDateStr('2027-03-31', 15);
      assert.strictEqual(unlockDate, '2027-03-16');
      const formatted = formatThaiDateArabic(unlockDate);
      assert.strictEqual(formatted, '16 มี.ค. 2570');
    });

    it('calculates auto-unlock date 15 days before Round 2 end (30 September -> 15 September)', () => {
      const unlockDate = computeAutoUnlockDateStr('2027-09-30', 15);
      assert.strictEqual(unlockDate, '2027-09-15');
      const formatted = formatThaiDateArabic(unlockDate);
      assert.strictEqual(formatted, '15 ก.ย. 2570');
    });

    it('supports custom configurable lead days (e.g. 30 days before round end)', () => {
      const unlockDate = computeAutoUnlockDateStr('2027-03-31', 30);
      assert.strictEqual(unlockDate, '2027-03-01');
      const formatted = formatThaiDateArabic(unlockDate);
      assert.strictEqual(formatted, '1 มี.ค. 2570');
    });

    it('strictly outputs Arabic numerals on Thai date labels (no Thai digits)', () => {
      const formatted = formatThaiDateArabic('2027-03-16');
      assert.match(formatted, /^[0-9]/, 'Must start with Arabic numeral');
      assert.doesNotMatch(formatted, /[๐-๙]/, 'Must NOT contain any Thai digits on Web UI');
    });
  });

  describe('2. Strict Precedence Order Testing', () => {
    const staffTeacher = 'TCH-001';
    const otherTeacher = 'TCH-002';

    // Case 1: Auto mode before 15-day window
    it('Case 1: Auto mode before 15-day window -> locked for teachers with clear auto open date', () => {
      // 10 March 2027 is before 16 March 2027
      const testDate = new Date('2027-03-10T08:00:00+07:00');
      const res = resolveEvaluationAccess({
        staffId: staffTeacher,
        isTeacher: true,
        isAuthorizedManager: false,
        period: round1,
        currentDate: testDate,
      });

      assert.strictEqual(res.isUnlocked, false);
      assert.strictEqual(res.canEditForm, false);
      assert.strictEqual(res.reason, 'auto_waiting');
      assert.strictEqual(res.statusLabel, 'เปิดประเมินอัตโนมัติ 16 มี.ค. 2570');
      assert.match(res.tooltip, /เปิดประเมินอัตโนมัติ 16 มี\.ค\. 2570/);
    });

    // Case 1b: Per-user override unlocks ONLY that specific teacher before 15-day window
    it('Case 1b: Per-user override unlocks ONLY the specific teacher before 15-day window', () => {
      const testDate = new Date('2027-03-10T08:00:00+07:00');
      const periodWithOverride: EvaluationAccessPeriod = {
        ...round1,
        unlockedStaffIds: [staffTeacher],
      };

      const resStaff = resolveEvaluationAccess({
        staffId: staffTeacher,
        isTeacher: true,
        isAuthorizedManager: false,
        period: periodWithOverride,
        currentDate: testDate,
      });

      const resOther = resolveEvaluationAccess({
        staffId: otherTeacher,
        isTeacher: true,
        isAuthorizedManager: false,
        period: periodWithOverride,
        currentDate: testDate,
      });

      assert.strictEqual(resStaff.isUnlocked, true, 'Manually unlocked teacher must be UNLOCKED');
      assert.strictEqual(resStaff.reason, 'per_user_override');
      assert.strictEqual(resStaff.statusLabel, 'เปิดให้ประเมินตนเอง');

      assert.strictEqual(resOther.isUnlocked, false, 'Other teacher must remain LOCKED');
      assert.strictEqual(resOther.reason, 'auto_waiting');
      assert.strictEqual(resOther.statusLabel, 'เปิดประเมินอัตโนมัติ 16 มี.ค. 2570');
    });

    // Case 2: Auto mode within 15-day window
    it('Case 2: Auto mode within 15-day window -> automatically unlocked for all civil servant teachers', () => {
      // 20 March 2027 is within 15-day window (after 16 March)
      const testDate = new Date('2027-03-20T08:00:00+07:00');
      const res = resolveEvaluationAccess({
        staffId: staffTeacher,
        isTeacher: true,
        isAuthorizedManager: false,
        period: round1,
        currentDate: testDate,
      });

      assert.strictEqual(res.isUnlocked, true);
      assert.strictEqual(res.canEditForm, true);
      assert.strictEqual(res.reason, 'auto_window');
      assert.strictEqual(res.statusLabel, 'เปิดให้ประเมินตนเอง');
    });

    // Case 3: Global Force Open ('open' / ปลดล็อกทั้งหมด)
    it('Case 3: Global Force Open (open) -> all teachers unlocked immediately regardless of date', () => {
      // 1 January 2027 is months before the window
      const testDate = new Date('2027-01-01T08:00:00+07:00');
      const openPeriod: EvaluationAccessPeriod = {
        ...round1,
        evaluationStatus: 'open',
      };

      const res = resolveEvaluationAccess({
        staffId: staffTeacher,
        isTeacher: true,
        isAuthorizedManager: false,
        period: openPeriod,
        currentDate: testDate,
      });

      assert.strictEqual(res.isUnlocked, true);
      assert.strictEqual(res.canEditForm, true);
      assert.strictEqual(res.reason, 'global_open');
      assert.strictEqual(res.statusLabel, 'เปิดให้ประเมินตนเอง');
    });

    // Case 4: Global Permanent Lock ('locked' / ปิดรอบถาวร)
    it('Case 4: Global Permanent Lock (locked) -> all teachers locked even within 15-day window', () => {
      // 25 March 2027 is inside 15-day window, but period is locked
      const testDate = new Date('2027-03-25T08:00:00+07:00');
      const lockedPeriod: EvaluationAccessPeriod = {
        ...round1,
        evaluationStatus: 'locked',
        isLocked: true,
      };

      const res = resolveEvaluationAccess({
        staffId: staffTeacher,
        isTeacher: true,
        isAuthorizedManager: false,
        period: lockedPeriod,
        currentDate: testDate,
      });

      assert.strictEqual(res.isUnlocked, false);
      assert.strictEqual(res.canEditForm, false);
      assert.strictEqual(res.reason, 'global_locked');
      assert.strictEqual(res.statusLabel, 'ปิดรอบประเมินแล้ว');
    });

    // Case 5: Priority 1 Override over Permanent Lock
    it('Case 5: Per-user override takes precedence even if global mode is locked', () => {
      const testDate = new Date('2027-03-25T08:00:00+07:00');
      const lockedPeriodWithOverride: EvaluationAccessPeriod = {
        ...round1,
        evaluationStatus: 'locked',
        isLocked: true,
        unlockedStaffIds: [staffTeacher],
      };

      const res = resolveEvaluationAccess({
        staffId: staffTeacher,
        isTeacher: true,
        isAuthorizedManager: false,
        period: lockedPeriodWithOverride,
        currentDate: testDate,
      });

      assert.strictEqual(res.isUnlocked, true, 'Priority 1 manual override must unlock the individual staff');
      assert.strictEqual(res.reason, 'per_user_override');
      assert.strictEqual(res.statusLabel, 'เปิดให้ประเมินตนเอง');
    });

    // Case 6: Manager permissions when locked
    it('Case 6: Director / HR Admin form inputs are read-only when locked', () => {
      const lockedPeriod: EvaluationAccessPeriod = {
        ...round1,
        evaluationStatus: 'locked',
        isLocked: true,
      };

      const res = resolveEvaluationAccess({
        staffId: 'EXE-001',
        isTeacher: false,
        isAuthorizedManager: true,
        period: lockedPeriod,
      });

      assert.strictEqual(res.canEditForm, false, 'Manager form inputs must be read-only when locked');
      assert.strictEqual(res.reason, 'global_locked');
    });
  });

  describe('Pre-Evaluation Agreement & Consent Trigger (shouldRequireEvaluationAgreement)', () => {
    it('shows modal when teacher opens their own editable draft for the first time (termsAcceptedAt is null)', () => {
      assert.strictEqual(
        shouldRequireEvaluationAgreement({
          isSelfEvaluation: true,
          canEditSelf: true,
          status: 'draft',
          termsAcceptedAt: null,
        }),
        true
      );
    });

    it('bypasses modal when teacher already accepted terms in the same fiscal round', () => {
      assert.strictEqual(
        shouldRequireEvaluationAgreement({
          isSelfEvaluation: true,
          canEditSelf: true,
          status: 'draft',
          termsAcceptedAt: '2026-11-26T10:30:00.000Z',
        }),
        false
      );
    });

    it('bypasses modal when Director / HR Admin opens another staff member evaluation', () => {
      assert.strictEqual(
        shouldRequireEvaluationAgreement({
          isSelfEvaluation: false,
          canEditSelf: true,
          status: 'draft',
          termsAcceptedAt: null,
        }),
        false
      );
    });

    it('bypasses modal when opened in read-only / locked round mode', () => {
      assert.strictEqual(
        shouldRequireEvaluationAgreement({
          isSelfEvaluation: true,
          canEditSelf: false,
          status: 'draft',
          termsAcceptedAt: null,
        }),
        false
      );
    });

    it('bypasses modal when evaluation is already finalized (evaluated / acknowledged / locked)', () => {
      for (const status of ['evaluated', 'acknowledged', 'locked']) {
        assert.strictEqual(
          shouldRequireEvaluationAgreement({
            isSelfEvaluation: true,
            canEditSelf: true,
            status,
            termsAcceptedAt: null,
          }),
          false,
          `Must bypass modal when status is ${status}`
        );
      }
    });
  });
});
