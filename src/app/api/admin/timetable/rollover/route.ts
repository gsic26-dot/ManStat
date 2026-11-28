import { NextResponse } from 'next/server';
import {
  dbGetTimetableBundle,
  dbGetTeachers,
  dbApplyTimetableRolloverBatch,
  dbIsTimetableLocked,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import {
  buildTimetableRollover,
  type TimetableRolloverMode,
} from '@/lib/regulations/timetable-rollover';
import type { TimetableSemester } from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const adminSession = await verifyTimetableManagerSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const sourceYear = String(body?.sourceYear || '').trim();
    const sourceSemester: TimetableSemester = String(body?.sourceSemester || '1').trim() === '2' ? '2' : '1';
    const targetYear = String(body?.targetYear || '').trim();
    const targetSemester: TimetableSemester = String(body?.targetSemester || '1').trim() === '2' ? '2' : '1';
    const mode: TimetableRolloverMode = body?.mode === 'fixed_only' ? 'fixed_only' : 'all';

    if (!sourceYear || !targetYear) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุปีการศึกษาต้นทางและปลายทางให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (sourceYear === targetYear && sourceSemester === targetSemester) {
      return NextResponse.json(
        { success: false, error: 'ภาคเรียนต้นทางและภาคเรียนปลายทางต้องไม่ซ้ำกัน' },
        { status: 400 }
      );
    }

    if (await dbIsTimetableLocked(targetYear, targetSemester)) {
      return NextResponse.json(
        { success: false, error: 'ตารางสอนภาคเรียนปลายทางถูกล็อกอยู่ กรุณาปลดล็อกก่อนคัดลอก' },
        { status: 423 }
      );
    }

    const [sourceBundle, targetBundle, activeTeachers] = await Promise.all([
      dbGetTimetableBundle(sourceYear, sourceSemester),
      dbGetTimetableBundle(targetYear, targetSemester),
      dbGetTeachers(),
    ]);

    const rollover = buildTimetableRollover({
      sourceYear,
      sourceSemester,
      targetYear,
      targetSemester,
      mode,
      sourceBundle,
      targetBundle,
      activeTeachers,
    });

    await dbApplyTimetableRolloverBatch({
      settingsToUpsert: rollover.settingsToUpsert,
      allocationsToCreate: rollover.allocationsToCreate,
      slotsToCreate: rollover.slotsToCreate,
      kindergartenToCreate: rollover.kindergartenToCreate,
    });

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'ROLLOVER_TIMETABLE',
      actorName,
      actorRole,
      `${sourceYear}/${sourceSemester}->${targetYear}/${targetSemester}`,
      `คัดลอกตารางสอนโหมด ${mode}: แผนการสอน ${rollover.allocationsToCreate.length}, คาบเรียน ${rollover.slotsToCreate.length}, ปฐมวัย ${rollover.kindergartenToCreate.length} (ข้ามซ้ำ ${rollover.skippedDuplicates})`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          mode,
          allocationsCreated: rollover.allocationsToCreate.length,
          slotsCreated: rollover.slotsToCreate.length,
          kindergartenCreated: rollover.kindergartenToCreate.length,
          skippedDuplicates: rollover.skippedDuplicates,
          skippedInactiveStaff: rollover.skippedInactiveStaff,
        },
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการคัดลอกตารางสอนข้ามเทอม/ข้ามปี';
    console.error('[API /api/admin/timetable/rollover POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
