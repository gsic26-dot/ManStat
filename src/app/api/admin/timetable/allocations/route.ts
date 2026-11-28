import { NextResponse } from 'next/server';
import {
  dbUpsertTimetableAllocation,
  dbDeleteTimetableAllocation,
  dbIsTimetableLocked,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import type { TimetableAllocation, TimetableSemester } from '@/lib/data/timetableTypes';

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
    const academicYear = String(body?.academicYear || '').trim();
    const semester: TimetableSemester = String(body?.semester || '1').trim() === '2' ? '2' : '1';
    const roomName = String(body?.roomName || '').trim();
    const subjectName = String(body?.subjectName || '').trim();
    const teacherId = String(body?.teacherId || '').trim();

    if (!academicYear || !roomName || !subjectName || !teacherId) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลแผนการสอนให้ครบถ้วน (ปีการศึกษา, ห้อง, รายวิชา, ครูผู้สอน)' },
        { status: 400 }
      );
    }

    if (await dbIsTimetableLocked(academicYear, semester)) {
      return NextResponse.json(
        { success: false, error: 'ตารางสอนภาคเรียนนี้ถูกล็อกโดยฝ่ายวิชาการ กรุณาปลดล็อกก่อนแก้ไขแผนการสอน' },
        { status: 423 }
      );
    }

    const allocation: TimetableAllocation = {
      id: String(body?.id || `ALLOC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`),
      academicYear,
      semester,
      roomName,
      subjectCode: String(body?.subjectCode || '').trim(),
      subjectName,
      subjectGroup: String(body?.subjectGroup || 'เพิ่มเติม / ประจำชั้น').trim(),
      subjectType: body?.subjectType || 'พื้นฐาน',
      teacherId,
      coTeacherId: String(body?.coTeacherId || '').trim(),
      periodsPerWeek: Math.max(1, Math.min(35, Number(body?.periodsPerWeek) || 1)),
      preferMorning: Boolean(body?.preferMorning),
      consecutivePeriods: Number(body?.consecutivePeriods) === 2 ? 2 : 1,
    };

    const saved = await dbUpsertTimetableAllocation(allocation);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'UPSERT_TIMETABLE_ALLOCATION',
      actorName,
      actorRole,
      `${roomName} (${academicYear}/${semester})`,
      `บันทึกแผนการสอน: ${subjectName} (${allocation.periodsPerWeek} คาบ/สัปดาห์) ห้อง ${roomName}`
    );

    return NextResponse.json(
      { success: true, data: saved },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกแผนการสอน';
    console.error('[API /api/admin/timetable/allocations POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminSession = await verifyTimetableManagerSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing allocation id' }, { status: 400 });
    }

    await dbDeleteTimetableAllocation(id);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog('DELETE_TIMETABLE_ALLOCATION', actorName, actorRole, id, `ลบรายการแผนการสอนรหัส ${id}`);

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบแผนการสอน';
    console.error('[API /api/admin/timetable/allocations DELETE Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
