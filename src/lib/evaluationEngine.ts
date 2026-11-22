/**
 * Performance Evaluation Scoring Engine & Template Matcher
 * ระบบคำนวณคะแนนการประเมินผลการปฏิบัติงานตามมาตรฐาน ก.ค.ศ. และ สพฐ.
 * รองรับทั้ง 6 แบบประเมินทางการ พร้อมคำนวณระดับผลการประเมิน 5 ระดับอัตโนมัติ
 */

import {
  EVALUATION_TEMPLATES,
  EvaluationTemplateKey,
  EvaluationTemplate,
  COMPONENT_2_CONFIG,
  COMPONENT_3_CONFIG,
} from '@/data/evaluationTemplates';

export type RatingLevel = 'ดีเด่น' | 'ดีมาก' | 'ดี' | 'พอใช้' | 'ปรับปรุง' | 'รอการประเมิน';

export interface EvaluationScores {
  // องค์ประกอบที่ 1 ตอนที่ 1: indicatorId ("1.1", "1.2", ...) -> ระดับคะแนน (1, 2, 3, 4)
  part1?: Record<string, number>;
  // องค์ประกอบที่ 1 ตอนที่ 2 (ประเด็นท้าทาย): itemId ("challenge_method", ...) -> ระดับ (1, 2, 3, 4)
  part2?: Record<string, number>;
  // องค์ประกอบที่ 2: ระดับการปฏิบัติงาน (1, 2, 3, 4, 5)
  comp2Level?: number;
  // องค์ประกอบที่ 3: itemId ("comp3_1", ..., "comp3_10") -> ระดับคะแนน (1, 2, 3, 4)
  comp3?: Record<string, number>;
}

export interface Component1Result {
  rawPart1: number;       // คะแนนรวมดิบ ตอนที่ 1
  part1Score: number;     // คะแนนแปลงแล้ว ตอนที่ 1
  rawPart2: number;       // คะแนนรวมดิบ ตอนที่ 2 (ประเด็นท้าทาย)
  part2Score: number;     // คะแนนแปลงแล้ว ตอนที่ 2
  totalComponent1: number;// คะแนนรวมองค์ประกอบที่ 1 (เต็ม 80)
}

export interface Component2Result {
  level: number;          // ระดับ (1 - 5)
  weight: number;         // ค่าน้ำหนัก (2)
  score: number;          // คะแนนที่ได้ (เต็ม 10)
}

export interface Component3Result {
  rawSum: number;         // คะแนนรวมดิบ 10 ข้อ (เต็ม 40)
  score: number;          // คะแนนแปลงแล้ว (rawSum / 4, เต็ม 10)
}

export interface EvaluationCalculationResult {
  templateKey: EvaluationTemplateKey;
  templateTitle: string;
  component1: Component1Result;
  component2: Component2Result;
  component3: Component3Result;
  grandTotal: number;     // คะแนนรวมสุทธิ (เต็ม 100, ทศนิยม 2 ตำแหน่ง)
  ratingLevel: RatingLevel;
}

/**
 * ปัดเศษทศนิยม 2 ตำแหน่งตามมาตรฐานการเงินและราชการ
 */
export function round2Decimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * 1. resolveEvaluationTemplate:
 * จับคู่ตำแหน่งและวิทยฐานะของบุคลากรเข้ากับ 1 ใน 6 แบบประเมินทางการของ สพฐ.
 */
export function resolveEvaluationTemplate(
  position: string,
  academicStanding?: string
): EvaluationTemplateKey {
  const normPos = (position || '').trim();
  const normStanding = (academicStanding || '').trim();

  // 1. ตำแหน่งผู้บริหารสถานศึกษา (ผู้อำนวยการ / รองผู้อำนวยการ)
  const isDirector =
    normPos.includes('ผู้อำนวยการ') ||
    normPos.includes('ผู้บริหาร') ||
    normPos.includes('รองผู้อำนวยการ');

  if (isDirector) {
    if (
      normStanding.includes('ชำนาญการพิเศษ') ||
      normStanding.includes('เชี่ยวชาญ') ||
      normPos.includes('ชำนาญการพิเศษ')
    ) {
      return 'director_special_expert';
    }
    if (normStanding.includes('ชำนาญการ') && !normStanding.includes('พิเศษ')) {
      return 'director_expert';
    }
    // หากเป็น ผอ. แต่ระบุ '-' หรือไม่ระบุ ค่าเริ่มต้นสำหรับโรงเรียนคือชำนาญการพิเศษ
    return 'director_special_expert';
  }

  // 2. ตำแหน่งครูผู้ช่วย
  if (normPos.includes('ครูผู้ช่วย')) {
    return 'teacher_assistant';
  }

  // 3. ตำแหน่งครู
  // 3.1 ครูชำนาญการพิเศษ (คศ.3) หรือเชี่ยวชาญ
  if (
    normStanding.includes('ชำนาญการพิเศษ') ||
    normStanding.includes('เชี่ยวชาญ') ||
    normPos.includes('ชำนาญการพิเศษ')
  ) {
    return 'teacher_special_expert';
  }

  // 3.2 ครูชำนาญการ (คศ.2)
  if (
    (normStanding.includes('ชำนาญการ') && !normStanding.includes('พิเศษ')) ||
    (normPos.includes('ชำนาญการ') && !normPos.includes('พิเศษ'))
  ) {
    return 'teacher_expert';
  }

  // 3.3 ครู คศ.1 / ยังไม่มีวิทยฐานะ
  return 'teacher_no_standing';
}

/**
 * 2. calculateComponent1Score:
 * คำนวณคะแนนองค์ประกอบที่ 1 (ประสิทธิภาพและประสิทธิผลการปฏิบัติงานตามมาตรฐานตำแหน่ง, เต็ม 80)
 */
export function calculateComponent1Score(
  templateKey: EvaluationTemplateKey,
  scores: EvaluationScores
): Component1Result {
  const template = EVALUATION_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`ไม่พบเทมเพลตการประเมิน: ${templateKey}`);
  }

  const part1Scores = scores.part1 || {};
  const part2Scores = scores.part2 || {};

  // Form 1: ครูผู้ช่วย (14 ตัวชี้วัด, ไม่มีประเด็นท้าทาย, สูตร: (sum * 80) / 56)
  if (!template.hasChallengePart) {
    let rawSum = 0;
    template.component1.part1.domains.forEach((domain) => {
      domain.indicators.forEach((ind) => {
        const val = part1Scores[ind.id] || 0;
        // ป้องกันค่าเกินช่วง 1-4
        const clamped = Math.max(0, Math.min(4, val));
        rawSum += clamped;
      });
    });

    const scaledScore = round2Decimals((rawSum * 80) / 56);
    return {
      rawPart1: rawSum,
      part1Score: scaledScore,
      rawPart2: 0,
      part2Score: 0,
      totalComponent1: scaledScore,
    };
  }

  // Forms 2, 3, 4, 5, 6: มี ตอนที่ 1 (15 ตัวชี้วัดเต็ม 60) + ตอนที่ 2 (ประเด็นท้าทายเต็ม 20)
  // ตอนที่ 1: ผลรวมตรง (Direct Sum) ของ 15 ตัวชี้วัด (เต็ม 60 คะแนน)
  let part1DirectSum = 0;
  template.component1.part1.domains.forEach((domain) => {
    domain.indicators.forEach((ind) => {
      const val = part1Scores[ind.id] || 0;
      const clamped = Math.max(0, Math.min(4, val));
      part1DirectSum += clamped;
    });
  });

  // ตอนที่ 2: ประเด็นท้าทาย (3 รายการ)
  // รายการที่ 1: วิธีดำเนินการ (เต็ม 20, ระดับ 1=5, 2=10, 3=15, 4=20)
  // รายการที่ 2.1: เชิงปริมาณ (เต็ม 10, ระดับ 1=2.5, 2=5, 3=7.5, 4=10)
  // รายการที่ 2.2: เชิงคุณภาพ (เต็ม 10, ระดับ 1=2.5, 2=5, 3=7.5, 4=10)
  // รวมดิบเต็ม 40 -> สูตร: (part2Sum * 20) / 40 (เต็ม 20 คะแนน)
  let rawChallengeSum = 0;
  if (template.component1.part2) {
    template.component1.part2.items.forEach((item) => {
      const level = part2Scores[item.id] as 1 | 2 | 3 | 4 | undefined;
      if (level && item.levelScores[level] !== undefined) {
        rawChallengeSum += item.levelScores[level];
      }
    });
  }

  const part2Converted = round2Decimals((rawChallengeSum * 20) / 40);
  const totalC1 = round2Decimals(part1DirectSum + part2Converted);

  return {
    rawPart1: part1DirectSum,
    part1Score: part1DirectSum,
    rawPart2: rawChallengeSum,
    part2Score: part2Converted,
    totalComponent1: totalC1,
  };
}

/**
 * 3. calculateComponent2Score:
 * คำนวณคะแนนองค์ประกอบที่ 2 (การมีส่วนร่วมในการพัฒนาการศึกษา, เต็ม 10)
 * สูตร: ระดับ (1-5) * ค่าน้ำหนัก (2)
 */
export function calculateComponent2Score(scores: EvaluationScores): Component2Result {
  const rawLevel = scores.comp2Level || 0;
  const level = Math.max(0, Math.min(5, Math.floor(rawLevel)));
  const weight = COMPONENT_2_CONFIG.weight;
  const score = level * weight;

  return {
    level,
    weight,
    score,
  };
}

/**
 * 4. calculateComponent3Score:
 * คำนวณคะแนนองค์ประกอบที่ 3 (การปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ, เต็ม 10)
 * สูตร: ผลรวม 10 ข้อ (เต็ม 40) / 4 = 10 คะแนนเต็ม
 */
export function calculateComponent3Score(scores: EvaluationScores): Component3Result {
  const comp3Scores = scores.comp3 || {};
  let rawSum = 0;

  COMPONENT_3_CONFIG.items.forEach((item) => {
    const val = comp3Scores[item.id] || 0;
    const clamped = Math.max(0, Math.min(4, val));
    rawSum += clamped;
  });

  const score = round2Decimals(rawSum / 4);
  return {
    rawSum,
    score,
  };
}

/**
 * 5. getRatingLevel:
 * แปลงคะแนนรวมสุทธิ (เต็ม 100) เป็นระดับผลการประเมิน 5 ระดับตามเกณฑ์ ก.ค.ศ.
 */
export function getRatingLevel(grandTotal: number, hasScores: boolean = true): RatingLevel {
  if (!hasScores) return 'รอการประเมิน';
  const score = round2Decimals(grandTotal);
  if (score >= 90.0) return 'ดีเด่น';
  if (score >= 80.0) return 'ดีมาก';
  if (score >= 70.0) return 'ดี';
  if (score >= 60.0) return 'พอใช้';
  return 'ปรับปรุง';
}

/**
 * 6. calculateEvaluationTotals:
 * ฟังก์ชันหลักในการรวมและคำนวณคะแนนทั้ง 3 องค์ประกอบ
 */
export function calculateEvaluationTotals(
  templateKey: EvaluationTemplateKey,
  scores: EvaluationScores
): EvaluationCalculationResult {
  const template = EVALUATION_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`ไม่พบเทมเพลต: ${templateKey}`);
  }

  const c1 = calculateComponent1Score(templateKey, scores);
  const c2 = calculateComponent2Score(scores);
  const c3 = calculateComponent3Score(scores);

  const hasScores =
    c1.rawPart1 > 0 ||
    c1.rawPart2 > 0 ||
    c2.level > 0 ||
    c3.rawSum > 0;

  const grandTotal = round2Decimals(c1.totalComponent1 + c2.score + c3.score);
  const ratingLevel = hasScores ? getRatingLevel(grandTotal, true) : 'รอการประเมิน';

  return {
    templateKey,
    templateTitle: template.title,
    component1: c1,
    component2: c2,
    component3: c3,
    grandTotal,
    ratingLevel,
  };
}

/**
 * 7. validateEvaluationScores:
 * ตรวจสอบความครบถ้วนของแบบประเมินก่อนยืนยันส่ง
 */
export function validateEvaluationScores(
  templateKey: EvaluationTemplateKey,
  scores: EvaluationScores
): { isValid: boolean; missingFields: string[] } {
  const template = EVALUATION_TEMPLATES[templateKey];
  const missing: string[] = [];

  if (!template) {
    return { isValid: false, missingFields: [`ไม่พบเทมเพลต ${templateKey}`] };
  }

  // ตรวจองค์ประกอบที่ 1 ตอนที่ 1
  const p1 = scores.part1 || {};
  template.component1.part1.domains.forEach((d) => {
    d.indicators.forEach((ind) => {
      if (!p1[ind.id] || p1[ind.id] < 1) {
        missing.push(`ตัวชี้วัดที่ ${ind.code} (${ind.name})`);
      }
    });
  });

  // ตรวจองค์ประกอบที่ 1 ตอนที่ 2 (ถ้ามี)
  if (template.hasChallengePart && template.component1.part2) {
    const p2 = scores.part2 || {};
    template.component1.part2.items.forEach((item) => {
      if (!p2[item.id] || p2[item.id] < 1) {
        missing.push(`ประเด็นท้าทาย ข้อ ${item.code} (${item.name})`);
      }
    });
  }

  // ตรวจองค์ประกอบที่ 2
  if (!scores.comp2Level || scores.comp2Level < 1) {
    missing.push('องค์ประกอบที่ 2 (การมีส่วนร่วมในการพัฒนาการศึกษา)');
  }

  // ตรวจองค์ประกอบที่ 3
  const p3 = scores.comp3 || {};
  COMPONENT_3_CONFIG.items.forEach((item) => {
    if (!p3[item.id] || p3[item.id] < 1) {
      missing.push(`องค์ประกอบที่ 3 ข้อ ${item.no} (${item.name.slice(0, 30)}...)`);
    }
  });

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}
