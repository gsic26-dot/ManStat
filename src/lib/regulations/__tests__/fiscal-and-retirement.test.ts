import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRetirementInfo, getFiscalYearBE } from '../fiscal-and-retirement';

describe('Civil-Service Retirement Calculation (พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 มาตรา 19)', () => {
  it('retires in the exact 60th fiscal year for Oct 1 birthday (NO +1 extension)', () => {
    const info = calculateRetirementInfo('1970-10-01', '2026-11-27');
    assert.equal(info.isRetireExtended, false);
    assert.equal(info.retireFiscalYearCE, 2030);
    assert.equal(info.retireFiscalYearBE, 2573);
    assert.equal(info.retireDateCE, '2030-09-30');
  });

  it('extends retirement by +1 fiscal year for Oct 2 birthday', () => {
    const info = calculateRetirementInfo('1970-10-02', '2026-11-27');
    assert.equal(info.isRetireExtended, true);
    assert.equal(info.retireFiscalYearCE, 2031);
    assert.equal(info.retireFiscalYearBE, 2574);
    assert.equal(info.retireDateCE, '2031-09-30');
  });

  it('retires without +1 extension for Sep 30 and Jan 1 birthdays', () => {
    const sep30 = calculateRetirementInfo('1975-09-30', '2026-11-27');
    assert.equal(sep30.isRetireExtended, false);
    assert.equal(sep30.retireFiscalYearBE, 2578); // 1975 + 60 + 543

    const jan01 = calculateRetirementInfo('1975-01-01', '2026-11-27');
    assert.equal(jan01.isRetireExtended, false);
    assert.equal(jan01.retireFiscalYearBE, 2578);
  });

  it('extends retirement by +1 fiscal year for Dec 31 birthday', () => {
    const dec31 = calculateRetirementInfo('1975-12-31', '2026-11-27');
    assert.equal(dec31.isRetireExtended, true);
    assert.equal(dec31.retireFiscalYearBE, 2579); // 1975 + 60 + 1 + 543
  });

  it('computes Thai fiscal year BE accurately across the Oct 1 boundary', () => {
    assert.equal(getFiscalYearBE('2026-09-30'), 2569);
    assert.equal(getFiscalYearBE('2026-10-01'), 2570);
  });
});
