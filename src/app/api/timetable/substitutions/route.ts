import { NextResponse } from 'next/server';
import { dbGetTeachingSubstitutions } from '@/lib/db/serverDb';
import { getCurrentThaiAcademicYear } from '@/lib/regulations/obec-admin-roles';
import type { TimetableSemester } from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = (searchParams.get('academicYear') || getCurrentThaiAcademicYear()).trim();
    const semester: TimetableSemester = (searchParams.get('semester') || '1').trim() === '2' ? '2' : '1';
    const date = (searchParams.get('date') || '').trim() || undefined;

    const list = await dbGetTeachingSubstitutions(academicYear, semester, date);

    return NextResponse.json(
      { success: true, data: list },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูลการจัดสอนแทน';
    console.error('[API /api/timetable/substitutions GET Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
