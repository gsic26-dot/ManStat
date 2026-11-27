import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_HIGHEST_SCOUT,
  getScoutRankScore,
  resolveHighestScout,
  type ScoutRankInput,
} from '../scout-ranking';

describe('Scout Qualification Ranking & Highest-Scout Sync (scout-ranking.ts)', () => {
  const btc: ScoutRankInput = {
    qualification: 'ผู้กำกับลูกเสือสามัญ ขั้นความรู้เบื้องต้น (B.T.C.)',
    badgeLevel: 'ขั้นความรู้เบื้องต้น (B.T.C.)',
    certificateNo: 'BTC-101',
    issueDate: '2018-05-01',
  };

  const atc: ScoutRankInput = {
    qualification: 'ผู้กำกับลูกเสือสามัญ ขั้นความรู้ชั้นสูง (A.T.C.)',
    badgeLevel: 'ขั้นความรู้ชั้นสูง (A.T.C.)',
    certificateNo: 'ATC-202',
    issueDate: '2020-06-15',
  };

  const wb: ScoutRankInput = {
    qualification: 'วูดแบดจ์ 2 ท่อน (W.B.)',
    badgeLevel: 'วูดแบดจ์ 2 ท่อน (W.B.)',
    certificateNo: 'WB-303',
    issueDate: '2022-08-10',
  };

  const alt: ScoutRankInput = {
    qualification: 'วูดแบดจ์ 3 ท่อน (A.L.T.)',
    badgeLevel: 'วูดแบดจ์ 3 ท่อน (A.L.T.)',
    certificateNo: 'ALT-404',
    issueDate: '2024-03-20',
  };

  const lt: ScoutRankInput = {
    qualification: 'วูดแบดจ์ 4 ท่อน (L.T.)',
    badgeLevel: 'วูดแบดจ์ 4 ท่อน (L.T.)',
    certificateNo: 'LT-505',
    issueDate: '2025-11-01',
  };

  it('orders scout ranks strictly: B.T.C. < A.T.C. < W.B. < A.L.T. < L.T.', () => {
    assert.ok(getScoutRankScore(btc) < getScoutRankScore(atc));
    assert.ok(getScoutRankScore(atc) < getScoutRankScore(wb));
    assert.ok(getScoutRankScore(wb) < getScoutRankScore(alt));
    assert.ok(getScoutRankScore(alt) < getScoutRankScore(lt));
  });

  it('falls back to the second-highest remaining rank and its certNo when the highest rank is deleted', () => {
    // Before delete: [btc, atc, wb, alt] -> alt
    assert.deepEqual(resolveHighestScout([btc, atc, wb, alt]), {
      highestScout: alt.qualification,
      scoutCertNo: 'ALT-404',
    });

    // After deleting alt: [btc, atc, wb] -> wb
    assert.deepEqual(resolveHighestScout([btc, atc, wb]), {
      highestScout: wb.qualification,
      scoutCertNo: 'WB-303',
    });
  });

  it('preserves the highest rank unchanged when a lower rank is deleted', () => {
    // Deleting btc leaves [atc, wb] -> still wb
    assert.deepEqual(resolveHighestScout([atc, wb]), {
      highestScout: wb.qualification,
      scoutCertNo: 'WB-303',
    });
  });

  it('returns the clean empty state when the last remaining scout record is deleted', () => {
    assert.deepEqual(resolveHighestScout([]), {
      highestScout: EMPTY_HIGHEST_SCOUT,
      scoutCertNo: '',
    });
  });

  it('breaks ties of identical rank by newer issueDate', () => {
    const olderWb: ScoutRankInput = {
      qualification: 'ผู้กำกับลูกเสือสำรอง วูดแบดจ์ 2 ท่อน (W.B.)',
      badgeLevel: 'วูดแบดจ์ 2 ท่อน (W.B.)',
      certificateNo: 'WB-OLD',
      issueDate: '2021-01-01',
    };
    const newerWb: ScoutRankInput = {
      qualification: 'ผู้กำกับลูกเสือสามัญ วูดแบดจ์ 2 ท่อน (W.B.)',
      badgeLevel: 'วูดแบดจ์ 2 ท่อน (W.B.)',
      certificateNo: 'WB-NEW',
      issueDate: '2025-05-01',
    };
    assert.deepEqual(resolveHighestScout([olderWb, newerWb]), {
      highestScout: newerWb.qualification,
      scoutCertNo: 'WB-NEW',
    });
  });
});
