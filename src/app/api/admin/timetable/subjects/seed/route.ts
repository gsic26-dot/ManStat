import { NextResponse } from 'next/server';
import {
  dbGetSchoolSubjects,
  dbSeedSchoolSubjects,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import { buildDefaultObecCurriculumPresets } from '@/lib/regulations/school-curriculum-presets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const adminSession = await verifyTimetableManagerSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบและฝ่ายวิชาการเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const presets = buildDefaultObecCurriculumPresets();
    const { insertedCount, skippedCount } = await dbSeedSchoolSubjects(presets);
    const allSubjects = await dbGetSchoolSubjects();

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'SEED_SCHOOL_SUBJECTS',
      actorName,
      actorRole,
      'คลังรายวิชา อ.1–ม.3',
      `นำเข้าโครงสร้างหลักสูตรมาตรฐาน สพฐ. เพิ่มใหม่ ${insertedCount} รายวิชา (ข้ามซ้ำ ${skippedCount} รายวิชา)`
    );

    return NextResponse.json(
      {
        success: true,
        insertedCount,
        skippedCount,
        totalCount: allSubjects.length,
        subjects: allSubjects,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้าหลักสูตรมาตรฐาน';
    console.error('[API /api/admin/timetable/subjects/seed POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
