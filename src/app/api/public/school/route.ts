import { NextResponse } from 'next/server';
import { dbGetSchoolInfo } from '@/lib/db/serverDb';
import { INITIAL_SCHOOL_INFO } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const schoolInfo = await dbGetSchoolInfo();
    const schoolName = schoolInfo?.schoolName?.trim() || INITIAL_SCHOOL_INFO.schoolName;
    return NextResponse.json(
      {
        success: true,
        school_name: schoolName,
        schoolName: schoolName,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        success: true,
        school_name: INITIAL_SCHOOL_INFO.schoolName,
        schoolName: INITIAL_SCHOOL_INFO.schoolName,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
