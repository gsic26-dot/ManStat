import { NextResponse } from 'next/server';
import { dbGetTimetableBundle } from '@/lib/db/serverDb';
import { getCurrentThaiAcademicYear } from '@/lib/regulations/obec-admin-roles';
import type { TimetableSemester } from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = (searchParams.get('academicYear') || getCurrentThaiAcademicYear()).trim();
    const rawSemester = (searchParams.get('semester') || '1').trim();
    const semester: TimetableSemester = rawSemester === '2' ? '2' : '1';

    const bundle = await dbGetTimetableBundle(academicYear, semester);

    return NextResponse.json(
      { success: true, data: bundle },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลตารางสอน';
    console.error('[API /api/timetable GET Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
