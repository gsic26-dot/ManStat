/**
 * ============================================================================
 * ManStat: Scout Qualification Ranking & Highest-Scout Resolver (scout-ranking.ts)
 * ============================================================================
 * Pure helper shared across server DB sync (dbUpsertScout / dbDeleteScout)
 * and tests so public.teachers (highest_scout, scout_cert_no) always reflects
 * the true highest National Scout Organization of Thailand qualification.
 *
 * Official Rank Order (Low -> High):
 *   1. B.T.C. (ขั้นความรู้เบื้องต้น)
 *   2. A.T.C. (ขั้นความรู้ชั้นสูง)
 *   3. W.B.   (วูดแบดจ์ 2 ท่อน)
 *   4. A.L.T. / A.L.T.C. (วูดแบดจ์ 3 ท่อน)
 *   5. L.T.   / L.T.C.   (วูดแบดจ์ 4 ท่อน)
 * ============================================================================
 */

import type { ScoutRecord } from '@/lib/data/schoolData';

export const EMPTY_HIGHEST_SCOUT = 'ไม่มีวุฒิลูกเสือ';

export type ScoutRankInput = Pick<
  ScoutRecord,
  'qualification' | 'badgeLevel' | 'certificateNo' | 'issueDate'
>;

export interface ResolvedHighestScout {
  highestScout: string;
  scoutCertNo: string;
}

/**
 * Returns numeric precedence score (0–5) for a Thai Scout leader qualification.
 * Checks A.L.T. / 3 ท่อน BEFORE L.T. / 4 ท่อน to avoid substring collisions.
 */
export function getScoutRankScore(
  record: Pick<ScoutRecord, 'qualification' | 'badgeLevel'>
): number {
  const combined = `${record.badgeLevel || ''} ${record.qualification || ''}`.toUpperCase();

  // Rank 5: 4 Beads — L.T. / L.T.C. (must exclude A.L.T. / A.L.T.C.)
  if (
    combined.includes('4 ท่อน') ||
    /(^|[^A-Z])L\.?T\.?C?\.?([^A-Z]|$)/.test(combined)
  ) {
    // Double-check it's not A.L.T. matched via partial token
    if (!combined.includes('A.L.T') && !combined.includes('ALT') && !combined.includes('3 ท่อน')) {
      return 5;
    }
  }

  // Rank 4: 3 Beads — A.L.T. / A.L.T.C.
  if (
    combined.includes('3 ท่อน') ||
    combined.includes('A.L.T') ||
    /(^|[^A-Z])ALTC?([^A-Z]|$)/.test(combined)
  ) {
    return 4;
  }

  // Rank 3: 2 Beads — Wood Badge (W.B.)
  if (
    combined.includes('2 ท่อน') ||
    combined.includes('W.B') ||
    /(^|[^A-Z])WB([^A-Z]|$)/.test(combined) ||
    combined.includes('วูดแบดจ์')
  ) {
    return 3;
  }

  // Rank 2: Advanced Training Course (A.T.C.)
  if (
    combined.includes('A.T.C') ||
    /(^|[^A-Z])ATC([^A-Z]|$)/.test(combined) ||
    combined.includes('ความรู้ชั้นสูง')
  ) {
    return 2;
  }

  // Rank 1: Basic Training Course (B.T.C.)
  if (
    combined.includes('B.T.C') ||
    /(^|[^A-Z])BTC([^A-Z]|$)/.test(combined) ||
    combined.includes('ความรู้เบื้องต้น')
  ) {
    return 1;
  }

  return 0;
}

/**
 * Resolves the highest scout qualification and certificate number from a staff member's
 * remaining scout records. Returns the repo's standard empty state when none remain.
 */
export function resolveHighestScout(records: ScoutRankInput[]): ResolvedHighestScout {
  const valid = records.filter(
    (r) =>
      Boolean(r.qualification && r.qualification.trim()) &&
      r.qualification.trim() !== EMPTY_HIGHEST_SCOUT &&
      r.qualification.trim() !== '-'
  );

  if (valid.length === 0) {
    return {
      highestScout: EMPTY_HIGHEST_SCOUT,
      scoutCertNo: '',
    };
  }

  const sorted = [...valid].sort((a, b) => {
    const scoreDiff = getScoutRankScore(b) - getScoutRankScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    const dateDiff = String(b.issueDate || '').localeCompare(String(a.issueDate || ''));
    if (dateDiff !== 0) return dateDiff;

    const aHasCert = Boolean(a.certificateNo && a.certificateNo.trim() && a.certificateNo.trim() !== '-');
    const bHasCert = Boolean(b.certificateNo && b.certificateNo.trim() && b.certificateNo.trim() !== '-');
    if (aHasCert !== bHasCert) return bHasCert ? 1 : -1;

    return 0;
  });

  const best = sorted[0];
  const certClean = (best.certificateNo || '').trim();
  return {
    highestScout: best.qualification.trim(),
    scoutCertNo: certClean === '-' ? '' : certClean,
  };
}
