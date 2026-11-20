import { NextResponse } from 'next/server';
import { dbGetSchoolInfo, dbSaveSchoolInfo, recordAuditLog } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import type { SchoolInfoRecord } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const schoolInfo = await dbGetSchoolInfo();
    return NextResponse.json(
      { success: true, data: schoolInfo },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/school GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานศึกษา' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await verifyAdminSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json();
    const updatedInfo: Partial<SchoolInfoRecord> = body;

    const saved = await dbSaveSchoolInfo(updatedInfo);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    const classCountText = Array.isArray(saved.activeClasses)
      ? `เปิดสอน ${saved.activeClasses.length} ชั้นเรียน`
      : '';

    recordAuditLog(
      'UPDATE_SCHOOL_INFO',
      actorName,
      actorRole,
      saved.schoolName,
      `ปรับปรุงข้อมูลสถานศึกษา: ${saved.schoolName} (ผอ. ${saved.directorName}) ปีงบประมาณ ${saved.fiscalYear} ${classCountText}`.trim()
    );

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกข้อมูลสถานศึกษาลงฐานข้อมูลเรียบร้อยแล้ว',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/school POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสถานศึกษา' },
      { status: 500 }
    );
  }
}
