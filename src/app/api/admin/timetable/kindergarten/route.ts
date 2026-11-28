import { NextResponse } from 'next/server';
import {
  dbUpsertKindergartenSchedule,
  dbDeleteKindergartenSchedule,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import { DEFAULT_KINDERGARTEN_ACTIVITIES } from '@/lib/regulations/timetable-utils';
import type { KindergartenSchedule, TimetableSemester } from '@/lib/data/timetableTypes';

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
    const roomName = String(body?.roomName || '').trim();
    const homeroomTeacherId = String(body?.homeroomTeacherId || '').trim();

    if (!academicYear || !roomName || !homeroomTeacherId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุปีการศึกษา ห้องเรียน และครูประจำชั้นปฐมวัยให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const schedule: KindergartenSchedule = {
      id: String(body?.id || `KG-${academicYear}-${semester}-${roomName}`),
      academicYear,
      semester,
      roomName,
      homeroomTeacherId,
      assistantTeacherId:
        body?.assistantTeacherId && body.assistantTeacherId !== homeroomTeacherId
          ? String(body.assistantTeacherId).trim()
          : '',
      weeklyHours: Math.max(1, Math.min(40, Number(body?.weeklyHours) || 25)),
      activitiesJson:
        Array.isArray(body?.activitiesJson) && body.activitiesJson.length > 0
          ? body.activitiesJson
          : DEFAULT_KINDERGARTEN_ACTIVITIES.map((a) => ({ ...a })),
    };

    const saved = await dbUpsertKindergartenSchedule(schedule);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'UPSERT_KINDERGARTEN_SCHEDULE',
      actorName,
      actorRole,
      `${roomName} (${academicYear}/${semester})`,
      `บันทึกตารางจัดประสบการณ์ปฐมวัยห้อง ${roomName} (${schedule.weeklyHours} ชม./สัปดาห์)`
    );

    return NextResponse.json(
      { success: true, data: saved },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกตารางปฐมวัย';
    console.error('[API /api/admin/timetable/kindergarten POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminSession = await verifyAdminSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing kindergarten schedule id' }, { status: 400 });
    }

    await dbDeleteKindergartenSchedule(id);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog('DELETE_KINDERGARTEN_SCHEDULE', actorName, actorRole, id, `ลบตารางปฐมวัยรหัส ${id}`);

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบตารางปฐมวัย';
    console.error('[API /api/admin/timetable/kindergarten DELETE Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
