import { NextResponse } from 'next/server';
import { dbUpsertTimetableSettings, recordAuditLog } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import type { TimetableSemester, TimetableSettings } from '@/lib/data/timetableTypes';

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

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุปีการศึกษา' },
        { status: 400 }
      );
    }

    const settings: TimetableSettings = {
      id: `${academicYear}-${semester}`,
      academicYear,
      semester,
      periodsConfig: Array.isArray(body?.periodsConfig) ? body.periodsConfig : [],
      fixedSlotsConfig: Array.isArray(body?.fixedSlotsConfig) ? body.fixedSlotsConfig : [],
      footerNote: typeof body?.footerNote === 'string' ? body.footerNote : '',
    };

    const saved = await dbUpsertTimetableSettings(settings);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'UPDATE_TIMETABLE_SETTINGS',
      actorName,
      actorRole,
      settings.id,
      `อัปเดตตั้งค่าคาบเรียนและหมายเหตุตารางสอน ปีการศึกษา ${academicYear} ภาคเรียนที่ ${semester}`
    );

    return NextResponse.json(
      { success: true, data: saved },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกตั้งค่าคาบเรียน';
    console.error('[API /api/admin/timetable/settings POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
