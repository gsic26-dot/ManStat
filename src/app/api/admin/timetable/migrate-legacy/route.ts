import { NextResponse } from 'next/server';
import {
  dbMigrateLegacyTeachingWorkloads,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import type { TimetableAllocation, TimetableSemester } from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const adminSession = await verifyAdminSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const academicYear = String(body?.academicYear || '').trim();
    const semester: TimetableSemester = String(body?.semester || '1').trim() === '2' ? '2' : '1';
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const removeLegacyAfterMigrate = Boolean(body?.removeLegacyAfterMigrate);

    if (!academicYear || rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกรายการงานสอนเดิมอย่างน้อย 1 รายการเพื่อโอนย้าย' },
        { status: 400 }
      );
    }

    const allocationsToCreate: TimetableAllocation[] = [];
    const legacyIds: string[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const legacyId = String(item?.legacyWorkloadId || '').trim();
      const subjectName = String(item?.subjectName || '').trim();
      const roomName = String(item?.roomName || '').trim();
      const teacherId = String(item?.teacherId || '').trim();
      if (!subjectName || !roomName || !teacherId) continue;

      if (legacyId) legacyIds.push(legacyId);
      allocationsToCreate.push({
        id: `ALLOC-MIG-${academicYear}-${semester}-${Date.now().toString(36)}-${i + 1}`,
        academicYear,
        semester,
        roomName,
        subjectCode: String(item?.subjectCode || '').trim(),
        subjectName,
        subjectGroup: String(item?.subjectGroup || 'เพิ่มเติม / ประจำชั้น').trim(),
        subjectType: item?.subjectType || 'พื้นฐาน',
        teacherId,
        coTeacherId: '',
        periodsPerWeek: Math.max(1, Math.min(35, Number(item?.periodsPerWeek) || 1)),
        preferMorning: Boolean(item?.preferMorning),
        consecutivePeriods: 1,
      });
    }

    const result = await dbMigrateLegacyTeachingWorkloads({
      allocationsToCreate,
      legacyWorkloadIdsToDelete: removeLegacyAfterMigrate ? legacyIds : [],
    });

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'MIGRATE_LEGACY_TEACHING_WORKLOAD',
      actorName,
      actorRole,
      `${academicYear}/${semester}`,
      `โอนย้ายงานสอนเดิมเข้าแผนการสอน ${result.createdAllocations.length} รายการ (ลบรายการเดิม ${result.deletedLegacyCount} รายการ)`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          createdAllocations: result.createdAllocations,
          migratedCount: result.createdAllocations.length,
          deletedLegacyCount: result.deletedLegacyCount,
        },
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโอนย้ายรายการงานสอนเดิม';
    console.error('[API /api/admin/timetable/migrate-legacy POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
