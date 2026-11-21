import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOfferedGradesSummary,
  countGradesPerTier,
  calculateLiveCensusDiff,
  getAutoPrimaryRoundByCalendar,
  getAutoSemesterByCalendar,
  syncTierClassrooms,
} from '../SchoolAcademicManager';

describe('SchoolAcademicManager: Grade Ordering, Classroom Sync & Live Diff', () => {
  describe('formatOfferedGradesSummary (Standard Pedagogical Ordering)', () => {
    it('returns default message when grades array is empty or undefined', () => {
      assert.equal(formatOfferedGradesSummary([]), 'ระดับชั้นที่เปิดสอน · ยังไม่ได้กำหนด');
      assert.equal(
        formatOfferedGradesSummary(undefined as unknown as string[]),
        'ระดับชั้นที่เปิดสอน · ยังไม่ได้กำหนด'
      );
    });

    it('correctly sorts all 12 classes in standard order when all grades are offered', () => {
      const allTwelve = [
        'อนุบาล 1',
        'อนุบาล 2',
        'อนุบาล 3',
        'ประถมศึกษาปีที่ 1',
        'ประถมศึกษาปีที่ 2',
        'ประถมศึกษาปีที่ 3',
        'ประถมศึกษาปีที่ 4',
        'ประถมศึกษาปีที่ 5',
        'ประถมศึกษาปีที่ 6',
        'มัธยมศึกษาปีที่ 1',
        'มัธยมศึกษาปีที่ 2',
        'มัธยมศึกษาปีที่ 3',
      ];
      const result = formatOfferedGradesSummary(allTwelve);
      assert.equal(result, 'ระดับชั้นที่เปิดสอน · อ.1 – ม.3 · 12 ระดับชั้น');
    });

    it('corrects out-of-order grade list [อ.2, ม.3, อ.1] into sorted range อ.1 – ม.3', () => {
      // Simulates user clicking อ.2 first, then ม.3, and adding อ.1 later
      const outOfOrder = ['อนุบาล 2', 'มัธยมศึกษาปีที่ 3', 'อนุบาล 1'];
      const result = formatOfferedGradesSummary(outOfOrder);
      assert.equal(result, 'ระดับชั้นที่เปิดสอน · อ.1 – ม.3 · 3 ระดับชั้น');
    });

    it('correctly handles typical primary school (อ.2 – ป.6) without อ.1 and without มัธยม', () => {
      const primarySchool = [
        'อนุบาล 2',
        'อนุบาล 3',
        'ประถมศึกษาปีที่ 1',
        'ประถมศึกษาปีที่ 2',
        'ประถมศึกษาปีที่ 3',
        'ประถมศึกษาปีที่ 4',
        'ประถมศึกษาปีที่ 5',
        'ประถมศึกษาปีที่ 6',
      ];
      const result = formatOfferedGradesSummary(primarySchool);
      assert.equal(result, 'ระดับชั้นที่เปิดสอน · อ.2 – ป.6 · 8 ระดับชั้น');
    });

    it('handles single grade selection properly without repeating dash range', () => {
      const singleGrade = ['ประถมศึกษาปีที่ 1'];
      const result = formatOfferedGradesSummary(singleGrade);
      assert.equal(result, 'ระดับชั้นที่เปิดสอน · ป.1 · 1 ระดับชั้น');
    });
  });

  describe('countGradesPerTier (Classroom Auto-Sync per Education Tier)', () => {
    it('correctly counts tiers when all grades are active (3 kindergarten, 6 primary, 3 secondary)', () => {
      const allTwelve = [
        'อนุบาล 1',
        'อนุบาล 2',
        'อนุบาล 3',
        'ประถมศึกษาปีที่ 1',
        'ประถมศึกษาปีที่ 2',
        'ประถมศึกษาปีที่ 3',
        'ประถมศึกษาปีที่ 4',
        'ประถมศึกษาปีที่ 5',
        'ประถมศึกษาปีที่ 6',
        'มัธยมศึกษาปีที่ 1',
        'มัธยมศึกษาปีที่ 2',
        'มัธยมศึกษาปีที่ 3',
      ];
      const { kGrades, pGrades, mGrades } = countGradesPerTier(allTwelve);
      assert.equal(kGrades, 3);
      assert.equal(pGrades, 6);
      assert.equal(mGrades, 3);
    });

    it('returns 0 for unselected tiers (e.g. primary school with no secondary classes)', () => {
      const primaryOnly = [
        'อนุบาล 2',
        'อนุบาล 3',
        'ประถมศึกษาปีที่ 1',
        'ประถมศึกษาปีที่ 2',
        'ประถมศึกษาปีที่ 3',
        'ประถมศึกษาปีที่ 4',
        'ประถมศึกษาปีที่ 5',
        'ประถมศึกษาปีที่ 6',
      ];
      const { kGrades, pGrades, mGrades } = countGradesPerTier(primaryOnly);
      assert.equal(kGrades, 2);
      assert.equal(pGrades, 6);
      assert.equal(mGrades, 0);
    });

    it('returns all zeroes when no grades are selected', () => {
      const { kGrades, pGrades, mGrades } = countGradesPerTier([]);
      assert.equal(kGrades, 0);
      assert.equal(pGrades, 0);
      assert.equal(mGrades, 0);
    });
  });

  describe('calculateLiveCensusDiff (Real-time Nov 10 vs Jun 10 student difference)', () => {
    it('returns positive difference (+2) when Nov round has more students', () => {
      const novTotal = 96;
      const junTotal = 94;
      const diff = calculateLiveCensusDiff(novTotal, junTotal);
      assert.equal(diff, 2);
    });

    it('returns negative difference (-1) when Nov round has fewer students', () => {
      const novTotal = 93;
      const junTotal = 94;
      const diff = calculateLiveCensusDiff(novTotal, junTotal);
      assert.equal(diff, -1);
    });

    it('returns 0 when student counts are identical in both rounds', () => {
      const novTotal = 94;
      const junTotal = 94;
      const diff = calculateLiveCensusDiff(novTotal, junTotal);
      assert.equal(diff, 0);
    });

    it('handles undefined or 0 inputs safely', () => {
      assert.equal(calculateLiveCensusDiff(0, 0), 0);
      assert.equal(calculateLiveCensusDiff(10, 0), 10);
      assert.equal(calculateLiveCensusDiff(0, 10), -10);
    });
  });

  describe('getAutoPrimaryRoundByCalendar (Automatic Primary Round Selection based on School Calendar)', () => {
    it('returns JUN_10 when current date is in the first semester (before 10 November)', () => {
      // 15 June 2026 for academic year 2569 (CE 2026)
      const juneDate = new Date(2026, 5, 15); // Month 5 = June
      assert.equal(getAutoPrimaryRoundByCalendar(2569, juneDate), 'JUN_10');

      // 9 November 2026 (day before census)
      const nov9Date = new Date(2026, 10, 9);
      assert.equal(getAutoPrimaryRoundByCalendar(2569, nov9Date), 'JUN_10');
    });

    it('returns NOV_10 from 10 November onwards for the current academic year', () => {
      // Exactly 10 November 2026
      const nov10Date = new Date(2026, 10, 10, 8, 0, 0);
      assert.equal(getAutoPrimaryRoundByCalendar(2569, nov10Date), 'NOV_10');

      // Today in mid-November (21 November 2026)
      const todayDate = new Date(2026, 10, 21);
      assert.equal(getAutoPrimaryRoundByCalendar(2569, todayDate), 'NOV_10');

      // Second semester in January 2027 (same academic year 2569)
      const janDate = new Date(2027, 0, 15);
      assert.equal(getAutoPrimaryRoundByCalendar(2569, janDate), 'NOV_10');
    });

    it('correctly defaults to JUN_10 for upcoming future academic year (e.g. 2570 / CE 2027)', () => {
      // Tested from current date 21 Nov 2026 against future year 2570 (CE 2027)
      const currentDate = new Date(2026, 10, 21);
      assert.equal(getAutoPrimaryRoundByCalendar(2570, currentDate), 'JUN_10');
    });
  });

  describe('getAutoSemesterByCalendar (Official OBEC / สพฐ. Academic Semester)', () => {
    it('returns Semester 1 for dates between 16 May and 31 October', () => {
      // Exact start boundary: 16 May
      assert.equal(getAutoSemesterByCalendar(new Date(2026, 4, 16)), 1); // Month 4 = May
      // Mid semester: 10 June
      assert.equal(getAutoSemesterByCalendar(new Date(2026, 5, 10)), 1);
      // Late semester: 15 August
      assert.equal(getAutoSemesterByCalendar(new Date(2026, 7, 15)), 1);
      // Exact end boundary: 31 October
      assert.equal(getAutoSemesterByCalendar(new Date(2026, 9, 31)), 1); // Month 9 = October
    });

    it('returns Semester 2 for dates between 1 November and 15 May', () => {
      // Exact start boundary: 1 November
      assert.equal(getAutoSemesterByCalendar(new Date(2026, 10, 1)), 2); // Month 10 = November
      // Mid semester: 21 November
      assert.equal(getAutoSemesterByCalendar(new Date(2026, 10, 21)), 2);
      // New year: 15 January
      assert.equal(getAutoSemesterByCalendar(new Date(2027, 0, 15)), 2);
      // Exact end boundary: 15 May
      assert.equal(getAutoSemesterByCalendar(new Date(2027, 4, 15)), 2); // Month 4 = May
    });
  });

  describe('syncTierClassrooms (Smart Classroom Sync Logic)', () => {
    it('returns 0 when tier has 0 active grades', () => {
      // Unchecking all grades in a tier drops room count to 0
      assert.equal(syncTierClassrooms(6, 0), 0);
      assert.equal(syncTierClassrooms(0, 0), 0);
    });

    it('expands rooms to match active grade count when current rooms is lower', () => {
      // 0 rooms initially, user selects 3 grades -> at least 3 rooms
      assert.equal(syncTierClassrooms(0, 3), 3);
      // 2 rooms initially, user selects 6 grades -> at least 6 rooms
      assert.equal(syncTierClassrooms(2, 6), 6);
    });

    it('preserves manual classroom additions if user clicked + to exceed grade count', () => {
      // User has 6 primary grades (ป.1 - ป.6) but has 2 rooms per grade = 12 rooms
      // Toggling another tier or re-evaluating tier with 6 grades preserves the 12 rooms
      assert.equal(syncTierClassrooms(12, 6), 12);
      // 8 rooms for 6 grades remains 8
      assert.equal(syncTierClassrooms(8, 6), 8);
    });
  });
});
