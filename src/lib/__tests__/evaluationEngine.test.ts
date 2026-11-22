import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  resolveEvaluationTemplate,
  calculateComponent1Score,
  calculateComponent2Score,
  calculateComponent3Score,
  calculateEvaluationTotals,
  getRatingLevel,
  validateEvaluationScores,
} from '../evaluationEngine';
import {
  EVALUATION_TEMPLATES,
  COMPONENT_2_CONFIG,
  COMPONENT_3_CONFIG,
  getTemplateIndicatorCountSummary,
} from '../../data/evaluationTemplates';

describe('Official OBEC Performance Evaluation Engine', () => {
  describe('1. Template Indicator Count and Structural Verification', () => {
    it('verifies exact indicator count across all 6 official evaluation templates', () => {
      const summary = getTemplateIndicatorCountSummary();
      assert.strictEqual(summary.length, 6);

      // Form 1: ครูผู้ช่วย (3 domains, 14 indicators, no challenge)
      const assistant = summary.find((s) => s.key === 'teacher_assistant')!;
      assert.strictEqual(assistant.domainsCount, 3);
      assert.strictEqual(assistant.part1Indicators, 14);
      assert.strictEqual(assistant.part2Items, 0);
      assert.strictEqual(assistant.comp2Items, 1);
      assert.strictEqual(assistant.comp3Items, 10);
      assert.strictEqual(assistant.totalItems, 25);

      // Form 2: ครู ยังไม่มีวิทยฐานะ (3 domains, 15 indicators, 3 challenge items)
      const teacherNoStanding = summary.find((s) => s.key === 'teacher_no_standing')!;
      assert.strictEqual(teacherNoStanding.domainsCount, 3);
      assert.strictEqual(teacherNoStanding.part1Indicators, 15);
      assert.strictEqual(teacherNoStanding.part2Items, 3);
      assert.strictEqual(teacherNoStanding.comp2Items, 1);
      assert.strictEqual(teacherNoStanding.comp3Items, 10);
      assert.strictEqual(teacherNoStanding.totalItems, 29);

      // Form 3: ครูชำนาญการ (3 domains, 15 indicators, 3 challenge items)
      const teacherExpert = summary.find((s) => s.key === 'teacher_expert')!;
      assert.strictEqual(teacherExpert.domainsCount, 3);
      assert.strictEqual(teacherExpert.part1Indicators, 15);
      assert.strictEqual(teacherExpert.part2Items, 3);
      assert.strictEqual(teacherExpert.comp2Items, 1);
      assert.strictEqual(teacherExpert.comp3Items, 10);
      assert.strictEqual(teacherExpert.totalItems, 29);

      // Form 4: ครูชำนาญการพิเศษ (3 domains, 15 indicators, 3 challenge items)
      const teacherSpecial = summary.find((s) => s.key === 'teacher_special_expert')!;
      assert.strictEqual(teacherSpecial.domainsCount, 3);
      assert.strictEqual(teacherSpecial.part1Indicators, 15);
      assert.strictEqual(teacherSpecial.part2Items, 3);
      assert.strictEqual(teacherSpecial.comp2Items, 1);
      assert.strictEqual(teacherSpecial.comp3Items, 10);
      assert.strictEqual(teacherSpecial.totalItems, 29);

      // Form 5: ผู้บริหารสถานศึกษา ชำนาญการ (5 domains, 15 indicators, 3 challenge items)
      const directorExpert = summary.find((s) => s.key === 'director_expert')!;
      assert.strictEqual(directorExpert.domainsCount, 5);
      assert.strictEqual(directorExpert.part1Indicators, 15);
      assert.strictEqual(directorExpert.part2Items, 3);
      assert.strictEqual(directorExpert.comp2Items, 1);
      assert.strictEqual(directorExpert.comp3Items, 10);
      assert.strictEqual(directorExpert.totalItems, 29);

      // Form 6: ผู้บริหารสถานศึกษา ชำนาญการพิเศษ (5 domains, 15 indicators, 3 challenge items)
      const directorSpecial = summary.find((s) => s.key === 'director_special_expert')!;
      assert.strictEqual(directorSpecial.domainsCount, 5);
      assert.strictEqual(directorSpecial.part1Indicators, 15);
      assert.strictEqual(directorSpecial.part2Items, 3);
      assert.strictEqual(directorSpecial.comp2Items, 1);
      assert.strictEqual(directorSpecial.comp3Items, 10);
      assert.strictEqual(directorSpecial.totalItems, 29);
    });
  });

  describe('2. Template Matcher (resolveEvaluationTemplate)', () => {
    it('resolves ครูผู้ช่วย to teacher_assistant', () => {
      assert.strictEqual(resolveEvaluationTemplate('ครูผู้ช่วย', '-'), 'teacher_assistant');
      assert.strictEqual(resolveEvaluationTemplate('ครูผู้ช่วย'), 'teacher_assistant');
    });

    it('resolves ครู คศ.1 or unranked teacher to teacher_no_standing', () => {
      assert.strictEqual(resolveEvaluationTemplate('ครู คศ. 1', '-'), 'teacher_no_standing');
      assert.strictEqual(resolveEvaluationTemplate('ครู', 'ไม่มีวิทยฐานะ'), 'teacher_no_standing');
      assert.strictEqual(resolveEvaluationTemplate('ครู', ''), 'teacher_no_standing');
    });

    it('resolves ครูชำนาญการ (คศ.2) to teacher_expert', () => {
      assert.strictEqual(resolveEvaluationTemplate('ครูชำนาญการ', 'ครูชำนาญการ'), 'teacher_expert');
      assert.strictEqual(resolveEvaluationTemplate('ครู คศ. 2', 'ชำนาญการ'), 'teacher_expert');
    });

    it('resolves ครูชำนาญการพิเศษ (คศ.3) to teacher_special_expert', () => {
      assert.strictEqual(resolveEvaluationTemplate('ครูชำนาญการพิเศษ', 'ครูชำนาญการพิเศษ'), 'teacher_special_expert');
      assert.strictEqual(resolveEvaluationTemplate('ครู คศ. 3', 'ชำนาญการพิเศษ'), 'teacher_special_expert');
    });

    it('resolves ผู้บริหารสถานศึกษา ชำนาญการ to director_expert', () => {
      assert.strictEqual(resolveEvaluationTemplate('ผู้อำนวยการโรงเรียน', 'ชำนาญการ'), 'director_expert');
      assert.strictEqual(resolveEvaluationTemplate('รองผู้อำนวยการ', 'ชำนาญการ'), 'director_expert');
    });

    it('resolves ผู้บริหารสถานศึกษา ชำนาญการพิเศษ to director_special_expert', () => {
      assert.strictEqual(resolveEvaluationTemplate('ผู้อำนวยการโรงเรียน', 'ชำนาญการพิเศษ'), 'director_special_expert');
      assert.strictEqual(resolveEvaluationTemplate('ผู้อำนวยการโรงเรียน', '-'), 'director_special_expert');
      assert.strictEqual(resolveEvaluationTemplate('ผู้อำนวยการโรงเรียน'), 'director_special_expert');
    });
  });

  describe('3. Form 1 (ครูผู้ช่วย) Scoring Logic: (sum * 80) / 56', () => {
    it('computes perfect score: 14 indicators * 4 = 56 raw -> 80.00 converted', () => {
      const part1: Record<string, number> = {};
      EVALUATION_TEMPLATES.teacher_assistant.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 4;
        });
      });

      const res = calculateComponent1Score('teacher_assistant', { part1 });
      assert.strictEqual(res.rawPart1, 56);
      assert.strictEqual(res.part1Score, 80);
      assert.strictEqual(res.rawPart2, 0);
      assert.strictEqual(res.totalComponent1, 80);
    });

    it('computes level 3 score: 14 indicators * 3 = 42 raw -> (42 * 80) / 56 = 60.00', () => {
      const part1: Record<string, number> = {};
      EVALUATION_TEMPLATES.teacher_assistant.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 3;
        });
      });

      const res = calculateComponent1Score('teacher_assistant', { part1 });
      assert.strictEqual(res.rawPart1, 42);
      assert.strictEqual(res.totalComponent1, 60);
    });
  });

  describe('4. Forms 2-6 Scoring Logic: Part 1 (Direct Sum max 60) + Part 2 Challenge ((sum * 20) / 40)', () => {
    it('computes perfect score: Part 1 = 60, Part 2 = 20 -> Component 1 Total = 80', () => {
      const part1: Record<string, number> = {};
      EVALUATION_TEMPLATES.teacher_special_expert.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 4;
        });
      });

      const part2: Record<string, number> = {
        challenge_method: 4,   // 20
        challenge_quantity: 4, // 10
        challenge_quality: 4,  // 10
      };

      const res = calculateComponent1Score('teacher_special_expert', { part1, part2 });
      assert.strictEqual(res.rawPart1, 60);
      assert.strictEqual(res.part1Score, 60);
      assert.strictEqual(res.rawPart2, 40); // 20 + 10 + 10
      assert.strictEqual(res.part2Score, 20); // (40 * 20) / 40
      assert.strictEqual(res.totalComponent1, 80);
    });

    it('computes Level 3 score: Part 1 = 45, Part 2 = 15 -> Component 1 Total = 60', () => {
      const part1: Record<string, number> = {};
      EVALUATION_TEMPLATES.director_special_expert.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 3;
        });
      });

      const part2: Record<string, number> = {
        challenge_method: 3,   // 15.0
        challenge_quantity: 3, // 7.5
        challenge_quality: 3,  // 7.5
      };

      const res = calculateComponent1Score('director_special_expert', { part1, part2 });
      assert.strictEqual(res.rawPart1, 45);
      assert.strictEqual(res.part1Score, 45);
      assert.strictEqual(res.rawPart2, 30); // 15 + 7.5 + 7.5
      assert.strictEqual(res.part2Score, 15); // (30 * 20) / 40
      assert.strictEqual(res.totalComponent1, 60);
    });
  });

  describe('5. Component 2 & Component 3 Scoring', () => {
    it('computes Component 2: level * 2', () => {
      assert.strictEqual(calculateComponent2Score({ comp2Level: 5 }).score, 10);
      assert.strictEqual(calculateComponent2Score({ comp2Level: 4 }).score, 8);
      assert.strictEqual(calculateComponent2Score({ comp2Level: 3 }).score, 6);
      assert.strictEqual(calculateComponent2Score({ comp2Level: 2 }).score, 4);
      assert.strictEqual(calculateComponent2Score({ comp2Level: 1 }).score, 2);
    });

    it('computes Component 3: 10 items / 4', () => {
      const comp3Max: Record<string, number> = {};
      COMPONENT_3_CONFIG.items.forEach((item) => {
        comp3Max[item.id] = 4;
      });
      const resMax = calculateComponent3Score({ comp3: comp3Max });
      assert.strictEqual(resMax.rawSum, 40);
      assert.strictEqual(resMax.score, 10);

      const comp3Mid: Record<string, number> = {};
      COMPONENT_3_CONFIG.items.forEach((item) => {
        comp3Mid[item.id] = 3;
      });
      const resMid = calculateComponent3Score({ comp3: comp3Mid });
      assert.strictEqual(resMid.rawSum, 30);
      assert.strictEqual(resMid.score, 7.5);
    });
  });

  describe('6. Grand Total & 5-Tier Rating', () => {
    it('classifies 5 rating tiers accurately according to OBEC standards', () => {
      assert.strictEqual(getRatingLevel(100), 'ดีเด่น');
      assert.strictEqual(getRatingLevel(90.0), 'ดีเด่น');
      assert.strictEqual(getRatingLevel(89.99), 'ดีมาก');
      assert.strictEqual(getRatingLevel(80.0), 'ดีมาก');
      assert.strictEqual(getRatingLevel(79.99), 'ดี');
      assert.strictEqual(getRatingLevel(70.0), 'ดี');
      assert.strictEqual(getRatingLevel(69.99), 'พอใช้');
      assert.strictEqual(getRatingLevel(60.0), 'พอใช้');
      assert.strictEqual(getRatingLevel(59.99), 'ปรับปรุง');
      assert.strictEqual(getRatingLevel(45.5), 'ปรับปรุง');
    });

    it('computes full evaluation result with all 3 components', () => {
      const part1: Record<string, number> = {};
      EVALUATION_TEMPLATES.teacher_special_expert.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 4;
        });
      });
      const part2: Record<string, number> = {
        challenge_method: 4,
        challenge_quantity: 4,
        challenge_quality: 4,
      };
      const comp3: Record<string, number> = {};
      COMPONENT_3_CONFIG.items.forEach((item) => {
        comp3[item.id] = 4;
      });

      const result = calculateEvaluationTotals('teacher_special_expert', {
        part1,
        part2,
        comp2Level: 5,
        comp3,
      });

      assert.strictEqual(result.component1.totalComponent1, 80);
      assert.strictEqual(result.component2.score, 10);
      assert.strictEqual(result.component3.score, 10);
      assert.strictEqual(result.grandTotal, 100);
      assert.strictEqual(result.ratingLevel, 'ดีเด่น');
    });
  });

  describe('7. Validation Logic', () => {
    it('detects missing fields when evaluation is incomplete', () => {
      const validation = validateEvaluationScores('teacher_assistant', {
        part1: { '1.1': 4 },
      });
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.missingFields.length > 0);
    });
  });

  describe('8. Phase 5 QA Audit: Edge-Case & Floating-Point Precision Hardening', () => {
    it('calculates ครูผู้ช่วย all-1 minimum edge case correctly', () => {
      const template = EVALUATION_TEMPLATES['teacher_assistant'];
      const part1: Record<string, number> = {};
      template.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 1;
        });
      });
      const comp3: Record<string, number> = {};
      COMPONENT_3_CONFIG.items.forEach((item) => {
        comp3[item.id] = 1;
      });

      const result = calculateEvaluationTotals('teacher_assistant', {
        part1,
        comp2Level: 1,
        comp3,
      });

      assert.strictEqual(result.component1.rawPart1, 14);
      assert.strictEqual(result.component1.part1Score, 20.0);
      assert.strictEqual(result.component1.totalComponent1, 20.0);
      assert.strictEqual(result.component2.score, 2.0);
      assert.strictEqual(result.component3.score, 2.5);
      assert.strictEqual(result.grandTotal, 24.5);
      assert.strictEqual(result.ratingLevel, 'ปรับปรุง');
    });

    it('calculates ครู คศ.1-3 all-1 minimum edge case correctly', () => {
      const template = EVALUATION_TEMPLATES['teacher_expert'];
      const part1: Record<string, number> = {};
      template.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 1;
        });
      });
      const part2 = {
        challenge_method: 1,
        challenge_quantity: 1,
        challenge_quality: 1,
      };
      const comp3: Record<string, number> = {};
      COMPONENT_3_CONFIG.items.forEach((item) => {
        comp3[item.id] = 1;
      });

      const result = calculateEvaluationTotals('teacher_expert', {
        part1,
        part2,
        comp2Level: 1,
        comp3,
      });

      assert.strictEqual(result.component1.rawPart1, 15);
      assert.strictEqual(result.component1.part1Score, 15);
      assert.strictEqual(result.component1.rawPart2, 10);
      assert.strictEqual(result.component1.part2Score, 5.0);
      assert.strictEqual(result.component1.totalComponent1, 20.0);
      assert.strictEqual(result.component2.score, 2.0);
      assert.strictEqual(result.component3.score, 2.5);
      assert.strictEqual(result.grandTotal, 24.5);
      assert.strictEqual(result.ratingLevel, 'ปรับปรุง');
    });

    it('calculates ผู้บริหารสถานศึกษา all-1 minimum edge case correctly', () => {
      const template = EVALUATION_TEMPLATES['director_special_expert'];
      const part1: Record<string, number> = {};
      template.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 1;
        });
      });
      const part2 = {
        challenge_method: 1,
        challenge_quantity: 1,
        challenge_quality: 1,
      };
      const comp3: Record<string, number> = {};
      COMPONENT_3_CONFIG.items.forEach((item) => {
        comp3[item.id] = 1;
      });

      const result = calculateEvaluationTotals('director_special_expert', {
        part1,
        part2,
        comp2Level: 1,
        comp3,
      });

      assert.strictEqual(result.component1.rawPart1, 15);
      assert.strictEqual(result.component1.totalComponent1, 20.0);
      assert.strictEqual(result.grandTotal, 24.5);
      assert.strictEqual(result.ratingLevel, 'ปรับปรุง');
    });

    it('strictly evaluates boundary ratings without floating-point artifacts', () => {
      assert.strictEqual(getRatingLevel(90.0), 'ดีเด่น');
      assert.strictEqual(getRatingLevel(89.999), 'ดีเด่น');
      assert.strictEqual(getRatingLevel(89.994), 'ดีมาก');
      assert.strictEqual(getRatingLevel(80.0), 'ดีมาก');
      assert.strictEqual(getRatingLevel(79.994), 'ดี');
      assert.strictEqual(getRatingLevel(70.0), 'ดี');
      assert.strictEqual(getRatingLevel(69.994), 'พอใช้');
      assert.strictEqual(getRatingLevel(60.0), 'พอใช้');
      assert.strictEqual(getRatingLevel(59.994), 'ปรับปรุง');
      assert.strictEqual(getRatingLevel(0.0), 'ปรับปรุง');
    });

    it('safely clamps scores when out-of-range values are passed', () => {
      const template = EVALUATION_TEMPLATES['teacher_assistant'];
      const part1: Record<string, number> = {};
      template.component1.part1.domains.forEach((d) => {
        d.indicators.forEach((ind) => {
          part1[ind.id] = 99; // Excess value
        });
      });
      const comp3: Record<string, number> = {};
      COMPONENT_3_CONFIG.items.forEach((item) => {
        comp3[item.id] = 99; // Excess value
      });

      const result = calculateEvaluationTotals('teacher_assistant', {
        part1,
        comp2Level: 99, // Excess value
        comp3,
      });

      // Clamped to max allowed
      assert.strictEqual(result.component1.totalComponent1, 80);
      assert.strictEqual(result.component2.score, 10);
      assert.strictEqual(result.component3.score, 10);
      assert.strictEqual(result.grandTotal, 100);
      assert.strictEqual(result.ratingLevel, 'ดีเด่น');
    });
  });
});
