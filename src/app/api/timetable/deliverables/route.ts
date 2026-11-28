import { NextResponse } from 'next/server';
import { dbGetAcademicDeliverables } from '@/lib/db/serverDb';
import type { TimetableSemester } from '@/lib/data/timetableTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = (searchParams.get('academicYear') || '').trim();
    const semester: TimetableSemester = (searchParams.get('semester') || '1').trim() === '2' ? '2' : '1';

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ academicYear' },
        { status: 400 }
      );
    }

    const data = await dbGetAcademicDeliverables(academicYear, semester);
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลการติดตามงานวิชาการได้';
    console.error('[API /api/timetable/deliverables GET Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
