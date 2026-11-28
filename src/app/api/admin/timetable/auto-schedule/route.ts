import { NextResponse } from 'next/server';
import {
  dbGetTimetableBundle,
  dbReplaceTimetableSlotsForRooms,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import { generateAutoSchedule } from '@/lib/regulations/auto-scheduler';
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
    const scopeRooms: string[] | undefined =
      Array.isArray(body?.scopeRooms) && body.scopeRooms.length > 0
        ? body.scopeRooms.map((r: unknown) => String(r).trim()).filter(Boolean)
        : undefined;
    const respectLockedSlots = body?.respectLockedSlots !== false;
    const dryRun = Boolean(body?.dryRun);

    if (!academicYear) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุปีการศึกษา' }, { status: 400 });
    }

    const bundle = await dbGetTimetableBundle(academicYear, semester);

    const effectiveRooms =
      scopeRooms && scopeRooms.length > 0
        ? scopeRooms
        : Array.from(new Set(bundle.allocations.map((a) => a.roomName)));

    if (effectiveRooms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ยังไม่มีข้อมูลแผนการสอนในภาคเรียนนี้ กรุณาเพิ่มรายวิชาในแท็บแผนการสอนก่อน' },
        { status: 400 }
      );
    }

    const result = generateAutoSchedule({
      academicYear,
      semester,
      allocations: bundle.allocations,
      existingSlots: bundle.slots,
      periodsConfig: bundle.settings.periodsConfig,
      scopeRooms: effectiveRooms,
      respectLockedSlots,
      clearUnlockedFirst: true,
    });

    if (dryRun) {
      return NextResponse.json(
        {
          success: true,
          data: {
            dryRun: true,
            placedCount: result.placedCount,
            lockedKeptCount: result.lockedKeptCount,
            unplaced: result.unplaced,
            conflictsCount: result.conflictsCount,
            previewSlotsCount: result.slots.length,
          },
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const roomSet = new Set(effectiveRooms);
    const scopedNewSlots = result.slots.filter((s) => roomSet.has(s.roomName));
    const savedScopedSlots = await dbReplaceTimetableSlotsForRooms(
      academicYear,
      semester,
      effectiveRooms,
      scopedNewSlots
    );

    const untouchedSlots = bundle.slots.filter((s) => !roomSet.has(s.roomName));
    const finalSlots = [...untouchedSlots, ...savedScopedSlots];

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'AUTO_SCHEDULE_TIMETABLE',
      actorName,
      actorRole,
      `${academicYear}/${semester} (${effectiveRooms.join(',')})`,
      `จัดตารางสอนอัตโนมัติ: ลงคาบใหม่ ${result.placedCount} คาบ, คงคาบล็อก ${result.lockedKeptCount} คาบ, รอจัด ${result.unplaced.length} รายการ`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          slots: finalSlots,
          placedCount: result.placedCount,
          lockedKeptCount: result.lockedKeptCount,
          unplaced: result.unplaced,
          conflictsCount: result.conflictsCount,
        },
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการจัดตารางสอนอัตโนมัติ';
    console.error('[API /api/admin/timetable/auto-schedule POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
