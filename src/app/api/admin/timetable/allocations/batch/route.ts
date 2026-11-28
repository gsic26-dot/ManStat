import { NextResponse } from 'next/server';
import {
  dbGetTimetableBundle,
  dbIsTimetableLocked,
  dbUpsertTimetableAllocation,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import type {
  TimetableAllocation,
  TimetableSemester,
  TimetableSubjectType,
} from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_ALLOC_TYPES: readonly TimetableSubjectType[] = [
  'พื้นฐาน',
  'เพิ่มเติม',
  'กิจกรรมพัฒนาผู้เรียน',
  'ประจำชั้น',
];

export async function POST(request: Request) {
  try {
    const adminSession = await verifyTimetableManagerSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบและฝ่ายวิชาการเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const academicYear = String(body?.academicYear || '').trim();
    const semester: TimetableSemester = String(body?.semester || '1').trim() === '2' ? '2' : '1';
    const roomName = String(body?.roomName || '').trim();
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (!academicYear || !roomName || rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุปีการศึกษา ห้องเรียน และรายวิชาที่ต้องการนำเข้าอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    if (await dbIsTimetableLocked(academicYear, semester)) {
      return NextResponse.json(
        { success: false, error: 'ตารางสอนภาคเรียนนี้ถูกล็อกโดยฝ่ายวิชาการ กรุณาปลดล็อกก่อนนำเข้าแผนการสอน' },
        { status: 423 }
      );
    }

    // Load existing allocations for idempotent deduplication in (academicYear, semester, roomName)
    const bundle = await dbGetTimetableBundle(academicYear, semester);
    const existingRoomAllocs = bundle.allocations.filter((a) => a.roomName === roomName);
    const existingCodes = new Set(
      existingRoomAllocs.map((a) => (a.subjectCode || '').trim().toLowerCase()).filter(Boolean)
    );
    const existingNames = new Set(
      existingRoomAllocs.map((a) => (a.subjectName || '').trim().toLowerCase()).filter(Boolean)
    );

    const created: TimetableAllocation[] = [];
    let skippedCount = 0;

    for (let idx = 0; idx < rawItems.length; idx += 1) {
      const item = rawItems[idx] || {};
      const subjectName = String(item.subjectName || '').trim();
      const subjectCode = String(item.subjectCode || '').trim();
      const teacherId = String(item.teacherId || '').trim();
      const periodsPerWeek = Number(item.periodsPerWeek);

      if (!subjectName || !teacherId || !Number.isFinite(periodsPerWeek) || periodsPerWeek <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `ข้อมูลรายวิชา "${subjectName || `#${idx + 1}`}" ไม่ครบถ้วน (ต้องระบุชื่อวิชา ครูผู้สอน และชั่วโมง/สัปดาห์ > 0)`,
          },
          { status: 400 }
        );
      }

      const normCode = subjectCode.toLowerCase();
      const normName = subjectName.toLowerCase();
      if ((normCode && existingCodes.has(normCode)) || existingNames.has(normName)) {
        skippedCount += 1;
        continue;
      }

      const rawType = String(item.subjectType || 'พื้นฐาน') as TimetableSubjectType;
      const subjectType: TimetableSubjectType = VALID_ALLOC_TYPES.includes(rawType)
        ? rawType
        : 'พื้นฐาน';

      const alloc: TimetableAllocation = {
        id: `ALLOC-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        academicYear,
        semester,
        roomName,
        subjectCode,
        subjectName,
        subjectGroup: String(item.subjectGroup || 'เพิ่มเติม / ประจำชั้น').trim(),
        subjectType,
        teacherId,
        coTeacherId: String(item.coTeacherId || '').trim(),
        periodsPerWeek: Math.max(1, Math.min(35, Math.round(periodsPerWeek))),
        preferMorning: Boolean(item.preferMorning),
        consecutivePeriods: Number(item.consecutivePeriods) === 2 ? 2 : 1,
      };

      const saved = await dbUpsertTimetableAllocation(alloc);
      created.push(saved);
      if (normCode) existingCodes.add(normCode);
      existingNames.add(normName);
    }

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'BATCH_IMPORT_ALLOCATIONS_FROM_CATALOG',
      actorName,
      actorRole,
      `${roomName} (${academicYear}/${semester})`,
      `ดึงรายวิชาจากคลังเข้าแผนการสอนห้อง ${roomName} สำเร็จ ${created.length} วิชา (ข้ามซ้ำ ${skippedCount} วิชา)`
    );

    return NextResponse.json(
      {
        success: true,
        insertedCount: created.length,
        skippedCount,
        created,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้าแผนการสอนแบบกลุ่ม';
    console.error('[API /api/admin/timetable/allocations/batch POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
