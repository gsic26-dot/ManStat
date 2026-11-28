import { NextResponse } from 'next/server';
import {
  dbUpsertTimetableSlot,
  dbDeleteTimetableSlot,
  dbToggleTimetableSlotLock,
  dbIsTimetableLocked,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import type { TimetableSemester, TimetableSlot } from '@/lib/data/timetableTypes';

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
    const dayOfWeek = Number(body?.dayOfWeek);
    const periodNo = Number(body?.periodNo);
    const subjectName = String(body?.subjectName || '').trim();
    const teacherId = String(body?.teacherId || '').trim();

    if (
      !academicYear ||
      !roomName ||
      !subjectName ||
      !teacherId ||
      !(dayOfWeek >= 1 && dayOfWeek <= 5) ||
      !(periodNo >= 1 && periodNo <= 7)
    ) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลคาบเรียนไม่ถูกต้อง (ต้องระบุปีการศึกษา, ห้อง, วัน 1-5, คาบ 1-7, รายวิชา และครูผู้สอน)' },
        { status: 400 }
      );
    }

    if (await dbIsTimetableLocked(academicYear, semester)) {
      return NextResponse.json(
        { success: false, error: 'ตารางสอนภาคเรียนนี้ถูกล็อกโดยฝ่ายวิชาการ กรุณาปลดล็อกก่อนแก้ไข' },
        { status: 423 }
      );
    }

    const slotId =
      String(body?.id || '').trim() ||
      `SLOT-${academicYear}-${semester}-${roomName}-D${dayOfWeek}-P${periodNo}`;

    const slot: TimetableSlot = {
      id: slotId,
      academicYear,
      semester,
      roomName,
      dayOfWeek,
      periodNo,
      allocationId: String(body?.allocationId || '').trim(),
      subjectCode: String(body?.subjectCode || '').trim(),
      subjectName,
      subjectGroup: String(body?.subjectGroup || '').trim(),
      subjectType: body?.subjectType || 'พื้นฐาน',
      teacherId,
      coTeacherId: String(body?.coTeacherId || '').trim(),
      isLocked: Boolean(body?.isLocked),
    };

    const saved = await dbUpsertTimetableSlot(slot);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'UPSERT_TIMETABLE_SLOT',
      actorName,
      actorRole,
      `${roomName} D${dayOfWeek}/P${periodNo}`,
      `บันทึกคาบเรียน: ${subjectName} ห้อง ${roomName} วัน ${dayOfWeek} คาบ ${periodNo} (${academicYear}/${semester})`
    );

    return NextResponse.json(
      { success: true, data: saved },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกคาบเรียน';
    console.error('[API /api/admin/timetable/slots POST Error]', err);
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
      return NextResponse.json({ success: false, error: 'Missing slot id' }, { status: 400 });
    }

    await dbDeleteTimetableSlot(id);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog('DELETE_TIMETABLE_SLOT', actorName, actorRole, id, `ลบคาบเรียนรหัส ${id}`);

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบคาบเรียน';
    console.error('[API /api/admin/timetable/slots DELETE Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminSession = await verifyTimetableManagerSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    const isLocked = Boolean(body?.isLocked);

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing slot id' }, { status: 400 });
    }

    const updated = await dbToggleTimetableSlotLock(id, isLocked);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'ไม่พบคาบเรียนที่ต้องการปรับสถานะล็อก' }, { status: 404 });
    }

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'TOGGLE_TIMETABLE_LOCK',
      actorName,
      actorRole,
      id,
      `${isLocked ? 'ปักหมุดล็อก' : 'ปลดล็อก'}คาบเรียนรหัส ${id}`
    );

    return NextResponse.json(
      { success: true, data: updated },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะล็อกคาบเรียน';
    console.error('[API /api/admin/timetable/slots PATCH Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
