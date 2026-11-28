/**
 * ============================================================================
 * ManStat: Smart Academic Year Rollover for Administrative Workloads
 * ============================================================================
 * Pure, deterministic helper for copying school administrative roles across
 * Thai academic years (e.g., 2569 -> 2570) without losing historical records.
 *
 * Business Rules:
 * 1. Preserve History: Never mutate or delete source-year records.
 * 2. Category Scope: Include 4-Division Admin Roles by default; optionally
 *    include Ad-hoc Projects/Committees. Never copy legacy teaching records.
 * 3. Active Staff Validation: Skip inactive/removed staff and prune inactive
 *    co-responsible IDs.
 * 4. Fresh-Year Reset: Clear orderOrRef and reset status to 'กำลังดำเนินการ'.
 * 5. Idempotent Deduplication: Skip records that already exist in targetYear.
 * ============================================================================
 */

import type { TeacherRecord, WorkloadCategory, WorkloadItem } from '@/lib/data/schoolData';
import { WORKLOAD_ADMIN_CATEGORY, normalizeDivisionName } from '@/lib/staffDivisions';

export const ADHOC_PROJECT_WORKLOAD_CATEGORY: WorkloadCategory =
  'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ';

export interface RolloverWorkloadsParams {
  sourceYear: string;
  targetYear: string;
  existingWorkloads: readonly WorkloadItem[];
  activeTeachers: readonly Pick<TeacherRecord, 'id'>[];
  includeAdminRoles?: boolean;
  includeAdhocProjects?: boolean;
  idGenerator?: (index: number, source: WorkloadItem) => string;
}

export interface RolloverWorkloadsResult {
  recordsToCreate: WorkloadItem[];
  skippedDuplicates: number;
  skippedInactiveStaff: number;
}

function buildDeduplicationKey(item: Pick<WorkloadItem, 'teacherId' | 'category' | 'subGroupOrLevel' | 'title'>): string {
  const normalizedDivision =
    item.category === WORKLOAD_ADMIN_CATEGORY
      ? (normalizeDivisionName(item.subGroupOrLevel) || (item.subGroupOrLevel || '').trim()).toLowerCase()
      : (item.subGroupOrLevel || '').trim().toLowerCase();
  const normalizedTitle = (item.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return `${item.teacherId}::${item.category}::${normalizedDivision}::${normalizedTitle}`;
}

export function buildRolloverWorkloads(params: RolloverWorkloadsParams): RolloverWorkloadsResult {
  const sourceYear = (params.sourceYear || '').trim();
  const targetYear = (params.targetYear || '').trim();

  if (!sourceYear || !targetYear || sourceYear === targetYear) {
    return {
      recordsToCreate: [],
      skippedDuplicates: 0,
      skippedInactiveStaff: 0,
    };
  }

  const includeAdminRoles = params.includeAdminRoles ?? true;
  const includeAdhocProjects = params.includeAdhocProjects ?? false;

  const allowedCategories = new Set<WorkloadCategory>();
  if (includeAdminRoles) allowedCategories.add(WORKLOAD_ADMIN_CATEGORY);
  if (includeAdhocProjects) allowedCategories.add(ADHOC_PROJECT_WORKLOAD_CATEGORY);

  if (allowedCategories.size === 0) {
    return {
      recordsToCreate: [],
      skippedDuplicates: 0,
      skippedInactiveStaff: 0,
    };
  }

  const activeStaffIds = new Set(params.activeTeachers.map((t) => t.id));

  // Build deduplication set from records already present in targetYear
  const targetKeys = new Set<string>();
  for (const item of params.existingWorkloads) {
    if ((item.academicYear || '').trim() === targetYear) {
      targetKeys.add(buildDeduplicationKey(item));
    }
  }

  const recordsToCreate: WorkloadItem[] = [];
  let skippedDuplicates = 0;
  let skippedInactiveStaff = 0;
  const batchStamp = Date.now().toString(36);

  for (const source of params.existingWorkloads) {
    if ((source.academicYear || '').trim() !== sourceYear) continue;
    if (!allowedCategories.has(source.category)) continue;

    if (!activeStaffIds.has(source.teacherId)) {
      skippedInactiveStaff += 1;
      continue;
    }

    const dedupKey = buildDeduplicationKey(source);
    if (targetKeys.has(dedupKey)) {
      skippedDuplicates += 1;
      continue;
    }

    const activeCoIds = Array.isArray(source.coResponsibleIds)
      ? Array.from(
          new Set(
            source.coResponsibleIds.filter(
              (coId) => coId !== source.teacherId && activeStaffIds.has(coId)
            )
          )
        )
      : [];

    const nextIndex = recordsToCreate.length;
    const newId = params.idGenerator
      ? params.idGenerator(nextIndex, source)
      : `WL-${targetYear}-${batchStamp}-${nextIndex + 1}`;

    recordsToCreate.push({
      id: newId,
      teacherId: source.teacherId,
      category: source.category,
      title: source.title,
      subGroupOrLevel:
        source.category === WORKLOAD_ADMIN_CATEGORY
          ? normalizeDivisionName(source.subGroupOrLevel) || source.subGroupOrLevel
          : source.subGroupOrLevel,
      hoursPerWeek: Number(source.hoursPerWeek) >= 0 ? Number(source.hoursPerWeek) : 2,
      roleInTask: source.roleInTask || 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่',
      orderOrRef: '',
      status: 'กำลังดำเนินการ',
      coEmp: undefined,
      academicYear: targetYear,
      scopeDescription: source.scopeDescription || '',
      obecSystems: Array.isArray(source.obecSystems) ? [...source.obecSystems] : [],
      coResponsibleIds: activeCoIds,
    });

    targetKeys.add(dedupKey);
  }

  return {
    recordsToCreate,
    skippedDuplicates,
    skippedInactiveStaff,
  };
}
