import { NextResponse } from 'next/server';
import {
  dbGetTimetableBundle,
  dbUpsertTimetableSettings,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import {
  DEFAULT_LUNCH_CONFIG,
  clampPeriodDurationMinutes,
} from '@/lib/regulations/timetable-utils';
import type { TimetableSemester, TimetableSettings } from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await verifyTimetableManagerSession();
    if (!session.authorized) {
      return NextResponse.json(
        { success: false, error: session.error || 'ไม่มีสิทธิ์เข้าถึง' },
        { status: session.status }
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

    const existingBundle = await dbGetTimetableBundle(academicYear, semester);
    const existingSettings = existingBundle.settings;
    const isLockToggleOnly = typeof body?.toggleLockOnly === 'boolean' && body.toggleLockOnly;

    // If locked and not explicitly toggling lock off, reject time-settings mutation
    if (existingSettings.isLocked && !isLockToggleOnly && body?.isLocked !== false) {
      return NextResponse.json(
        { success: false, error: 'ตารางสอนภาคเรียนนี้ถูกล็อกโดยฝ่ายวิชาการ กรุณาปลดล็อกก่อนแก้ไข' },
        { status: 423 }
      );
    }

    const rawPeriods = Array.isArray(body?.periodsConfig) && body.periodsConfig.length > 0
      ? body.periodsConfig
      : existingSettings.periodsConfig;

    const clampedPeriods = rawPeriods.map((p: any) => {
      const mins = clampPeriodDurationMinutes(p?.durationMinutes ?? 60);
      return {
        ...p,
        durationMinutes: mins,
        durationHours: Math.round((mins / 60) * 100) / 100,
      };
    });

    const rawLunch = body?.lunchConfig && typeof body.lunchConfig === 'object'
      ? body.lunchConfig
      : existingSettings.lunchConfig || DEFAULT_LUNCH_CONFIG;

    const clampedLunch = {
      afterPeriod: Math.max(2, Math.min(4, Number(rawLunch.afterPeriod) || 3)),
      startTime: String(rawLunch.startTime || DEFAULT_LUNCH_CONFIG.startTime),
      endTime: String(rawLunch.endTime || DEFAULT_LUNCH_CONFIG.endTime),
      durationMinutes: clampPeriodDurationMinutes(rawLunch.durationMinutes ?? 60),
    };

    const nextIsLocked =
      typeof body?.isLocked === 'boolean' ? body.isLocked : Boolean(existingSettings.isLocked);

    const settings: TimetableSettings = {
      id: `${academicYear}-${semester}`,
      academicYear,
      semester,
      periodsConfig: clampedPeriods,
      fixedSlotsConfig: Array.isArray(body?.fixedSlotsConfig)
        ? body.fixedSlotsConfig
        : existingSettings.fixedSlotsConfig || [],
      footerNote:
        typeof body?.footerNote === 'string' ? body.footerNote : existingSettings.footerNote || '',
      isLocked: nextIsLocked,
      lunchConfig: clampedLunch,
    };

    const saved = await dbUpsertTimetableSettings(settings);

    const actorName = `${session.user?.name || 'ผู้ดูแลระบบ'} (${session.user?.position || 'Academic'})`;
    const actorRole = session.user?.role || 'hr_admin';
    recordAuditLog(
      isLockToggleOnly ? 'TOGGLE_MASTER_TIMETABLE_LOCK' : 'UPDATE_TIMETABLE_SETTINGS',
      actorName,
      actorRole,
      settings.id,
      isLockToggleOnly
        ? `${nextIsLocked ? 'ล็อก' : 'ปลดล็อก'}ตารางสอนภาคเรียน ${academicYear}/${semester}`
        : `อัปเดตตั้งค่าเวลาเรียนและพักกลางวัน ปีการศึกษา ${academicYear} ภาคเรียนที่ ${semester}`
    );

    return NextResponse.json(
      { success: true, data: saved },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกตั้งค่าเวลาเรียน';
    console.error('[API /api/admin/timetable/settings POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
