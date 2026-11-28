import { NextResponse } from 'next/server';
import { dbUpsertAcademicDeliverable, recordAuditLog } from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import type {
  AcademicDeliverableRecord,
  DeliverableStatus,
  TimetableSemester,
} from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_STATUSES: readonly DeliverableStatus[] = ['pending', 'reviewing', 'submitted'];

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
    const teacherId = String(body?.teacherId || '').trim();
    const roomName = String(body?.roomName || '').trim();
    const subjectName = String(body?.subjectName || '').trim();

    if (!academicYear || !teacherId || !roomName || !subjectName) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุข้อมูลปีการศึกษา ครูผู้สอน ชั้นเรียน และรายวิชาให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const rawLp = String(body?.lessonPlanStatus || 'pending') as DeliverableStatus;
    const rawGb = String(body?.gradebookStatus || 'pending') as DeliverableStatus;
    const lessonPlanStatus: DeliverableStatus = VALID_STATUSES.includes(rawLp) ? rawLp : 'pending';
    const gradebookStatus: DeliverableStatus = VALID_STATUSES.includes(rawGb) ? rawGb : 'pending';

    const record: AcademicDeliverableRecord = {
      id: String(body?.id || '').trim(),
      academicYear,
      semester,
      teacherId,
      roomName,
      subjectName,
      subjectCode: String(body?.subjectCode || '').trim(),
      lessonPlanStatus,
      gradebookStatus,
      remarks: String(body?.remarks || '').trim(),
    };

    const saved = await dbUpsertAcademicDeliverable(record);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'UPSERT_ACADEMIC_DELIVERABLE',
      actorName,
      actorRole,
      `${roomName} · ${subjectName} (${academicYear}/${semester})`,
      `อัปเดตสถานะส่งงานวิชาการ: แผนการสอน=${lessonPlanStatus}, ปพ.5=${gradebookStatus}`
    );

    return NextResponse.json(
      { success: true, data: saved },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกสถานะงานวิชาการ';
    console.error('[API /api/admin/timetable/deliverables POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
