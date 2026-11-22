import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  toThaiDigits,
  formatThaiNumber,
  formatThaiDateWithDigits,
  getEvaluationPeriodThaiRange,
} from '../evaluationPrintUtils';

describe('evaluationPrintUtils', () => {
  it('converts Arabic numerals to Thai digits correctly', () => {
    assert.strictEqual(toThaiDigits('0123456789'), '๐๑๒๓๔๕๖๗๘๙');
    assert.strictEqual(toThaiDigits(2570), '๒๕๗๐');
    assert.strictEqual(toThaiDigits(80.5), '๘๐.๕');
    assert.strictEqual(toThaiDigits(''), '');
    assert.strictEqual(toThaiDigits(null), '');
    assert.strictEqual(toThaiDigits(undefined), '');
  });

  it('formats Thai numbers with decimal precision', () => {
    assert.strictEqual(formatThaiNumber(100, 0), '๑๐๐');
    assert.strictEqual(formatThaiNumber(85.75, 2), '๘๕.๗๕');
    assert.strictEqual(formatThaiNumber(90, 2), '๙๐.๐๐');
    assert.strictEqual(formatThaiNumber(null), '-');
  });

  it('formats dates in Thai with Thai digits', () => {
    const formatted = formatThaiDateWithDigits(new Date(2026, 9, 1)); // October 1, 2026 -> 2569
    assert.strictEqual(formatted, '๑ ตุลาคม ๒๕๖๙');
  });

  it('generates correct evaluation period range text', () => {
    const round1 = getEvaluationPeriodThaiRange(1, 2570);
    assert.strictEqual(round1.roundLabel, 'ครั้งที่ ๑');
    assert.strictEqual(round1.startDateText, '๑ ตุลาคม ๒๕๖๙');
    assert.strictEqual(round1.endDateText, '๓๑ มีนาคม ๒๕๗๐');
    assert.strictEqual(round1.fullRangeText, '๑ ตุลาคม ๒๕๖๙ ถึง ๓๑ มีนาคม ๒๕๗๐');

    const round2 = getEvaluationPeriodThaiRange(2, 2570);
    assert.strictEqual(round2.roundLabel, 'ครั้งที่ ๒');
    assert.strictEqual(round2.startDateText, '๑ เมษายน ๒๕๗๐');
    assert.strictEqual(round2.endDateText, '๓๐ กันยายน ๒๕๗๐');
    assert.strictEqual(round2.fullRangeText, '๑ เมษายน ๒๕๗๐ ถึง ๓๐ กันยายน ๒๕๗๐');
  });
});
