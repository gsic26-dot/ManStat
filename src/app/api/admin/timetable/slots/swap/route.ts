import { NextResponse } from 'next/server';
import {
  dbGetTimetableBundle,
  dbGetTeachers,
  dbSwapTimetableSlots,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import { evaluateSmartSwapTargets } from '@/lib/regulations/auto-scheduler';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import type { TimetableSemester } from '@/lib/data/timetableTypes';

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
    const sourceDay = Number(body?.source?.dayOfWeek);
    const sourcePeriod = Number(body?.source?.periodNo);
    const targetDay = Number(body?.target?.dayOfWeek);
    const targetPeriod = Number(body?.target?.periodNo);

    if (
      !academicYear ||
      !roomName ||
      !(sourceDay >= 1 && sourceDay <= 5) ||
      !(sourcePeriod >= 1 && sourcePeriod <= 7) ||
      !(targetDay >= 1 && targetDay <= 5) ||
      !(targetPeriod >= 1 && targetPeriod <= 7)
    ) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลตำแหน่งคาบสำหรับสลับไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (sourceDay === targetDay && sourcePeriod === targetPeriod) {
      return NextResponse.json(
        { success: false, error: 'คาบต้นทางและคาบปลายทางเป็นตำแหน่งเดียวกัน' },
        { status: 400 }
      );
    }

    const [bundle, teachers] = await Promise.all([
      dbGetTimetableBundle(academicYear, semester),
      dbGetTeachers(),
    ]);

    const teacherNames = new Map(teachers.map((t) => [t.id, formatStaffName(t)]));

    // Server-side re-validation (never trust client blindly)
    const evalMap = evaluateSmartSwapTargets({
      roomName,
      source: { dayOfWeek: sourceDay, periodNo: sourcePeriod },
      slots: bundle.slots,
      teacherNames,
    });

    const targetEval = evalMap.get(`${targetDay}-${targetPeriod}`);
    if (!targetEval || targetEval.status !== 'valid') {
      return NextResponse.json(
        {
          success: false,
          error: targetEval?.reason || 'ไม่สามารถสลับไปยังคาบเรียนปลายทางนี้ได้',
        },
        { status: 409 }
      );
    }

    const updatedSlots = await dbSwapTimetableSlots(
      academicYear,
      semester,
      roomName,
      { dayOfWeek: sourceDay, periodNo: sourcePeriod },
      { dayOfWeek: targetDay, periodNo: targetPeriod }
    );

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'SWAP_TIMETABLE_SLOT',
      actorName,
      actorRole,
      `${roomName} D${sourceDay}P${sourcePeriod}<->D${targetDay}P${targetPeriod}`,
      `สลับคาบเรียนห้อง ${roomName}: วัน ${sourceDay} คาบ ${sourcePeriod} <-> วัน ${targetDay} คาบ ${targetPeriod} (${academicYear}/${semester})`
    );

    return NextResponse.json(
      { success: true, data: { slots: updatedSlots } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสลับคาบเรียน';
    console.error('[API /api/admin/timetable/slots/swap POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
