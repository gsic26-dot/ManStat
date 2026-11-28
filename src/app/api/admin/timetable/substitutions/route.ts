import { NextResponse } from 'next/server';
import {
  dbGetTeachingSubstitutions,
  dbUpsertTeachingSubstitution,
  dbDeleteTeachingSubstitution,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import type { TeachingSubstitution, TimetableSemester } from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    // Daily substitutions remain editable even when the Master Timetable is locked!
    const session = await verifyTimetableManagerSession();
    if (!session.authorized) {
      return NextResponse.json(
        { success: false, error: session.error || 'ไม่มีสิทธิ์จัดสอนแทน' },
        { status: session.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const academicYear = String(body?.academicYear || '').trim();
    const semester: TimetableSemester = String(body?.semester || '1').trim() === '2' ? '2' : '1';
    const subDate = String(body?.subDate || '').trim();
    const roomName = String(body?.roomName || '').trim();
    const dayOfWeek = Number(body?.dayOfWeek);
    const periodNo = Number(body?.periodNo);
    const subjectName = String(body?.subjectName || '').trim();
    const absentTeacherId = String(body?.absentTeacherId || '').trim();
    const substituteTeacherId = String(body?.substituteTeacherId || '').trim();

    if (
      !academicYear ||
      !subDate ||
      !roomName ||
      !subjectName ||
      !absentTeacherId ||
      !substituteTeacherId ||
      !(dayOfWeek >= 1 && dayOfWeek <= 5) ||
      !(periodNo >= 0 && periodNo <= 7)
    ) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลการจัดสอนแทนไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    // Server-side check: prevent assigning the same substitute to 2 rooms at the exact same date & period
    const existingForDate = await dbGetTeachingSubstitutions(academicYear, semester, subDate);
    const clash = existingForDate.find(
      (s) =>
        s.substituteTeacherId === substituteTeacherId &&
        s.roomName !== roomName &&
        (s.periodNo === periodNo || s.periodNo === 0 || periodNo === 0)
    );
    if (clash) {
      return NextResponse.json(
        {
          success: false,
          error: `บุคลากรท่านนี้ถูกจัดให้สอนแทนห้อง ${clash.roomName} ในช่วงเวลานี้แล้ว`,
        },
        { status: 409 }
      );
    }

    const sub: TeachingSubstitution = {
      id: `SUB-${subDate}-${roomName}-P${periodNo}`,
      academicYear,
      semester,
      subDate,
      roomName,
      dayOfWeek,
      periodNo,
      subjectName,
      absentTeacherId,
      substituteTeacherId,
      leaveId: String(body?.leaveId || '').trim(),
      note: String(body?.note || '').trim(),
    };

    const saved = await dbUpsertTeachingSubstitution(sub);

    const actorName = `${session.user?.name || 'ผู้ดูแลระบบ'} (${session.user?.position || 'Academic'})`;
    const actorRole = session.user?.role || 'hr_admin';
    recordAuditLog(
      'UPSERT_SUBSTITUTION',
      actorName,
      actorRole,
      `${subDate} ${roomName} P${periodNo}`,
      `จัดสอนแทนวันที่ ${subDate} ห้อง ${roomName} (${subjectName}): ${substituteTeacherId} แทน ${absentTeacherId}`
    );

    return NextResponse.json(
      { success: true, data: saved },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกการจัดสอนแทน';
    console.error('[API /api/admin/timetable/substitutions POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifyTimetableManagerSession();
    if (!session.authorized) {
      return NextResponse.json(
        { success: false, error: session.error || 'ไม่มีสิทธิ์ลบรายการจัดสอนแทน' },
        { status: session.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing substitution id' }, { status: 400 });
    }

    await dbDeleteTeachingSubstitution(id);

    const actorName = `${session.user?.name || 'ผู้ดูแลระบบ'} (${session.user?.position || 'Academic'})`;
    const actorRole = session.user?.role || 'hr_admin';
    recordAuditLog('DELETE_SUBSTITUTION', actorName, actorRole, id, `ลบรายการจัดสอนแทนรหัส ${id}`);

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบรายการจัดสอนแทน';
    console.error('[API /api/admin/timetable/substitutions DELETE Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
