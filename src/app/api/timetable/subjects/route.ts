import { NextResponse } from 'next/server';
import { dbGetSchoolSubjects } from '@/lib/db/serverDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const subjects = await dbGetSchoolSubjects();
    return NextResponse.json(
      { success: true, subjects, data: subjects },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ไม่สามารถโหลดคลังรายวิชาได้';
    console.error('[API /api/timetable/subjects GET Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
