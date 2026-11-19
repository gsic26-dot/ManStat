import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import type { SchoolInfoRecord } from '@/lib/data/schoolData';

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json({ success: true, data: db.schoolInfo });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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

    const db = loadDatabase();
    db.schoolInfo = {
      ...db.schoolInfo,
      ...updatedInfo,
    };

    saveDatabase(db);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'UPDATE_SCHOOL_INFO',
      actorName,
      actorRole,
      db.schoolInfo.schoolName,
      `ปรับปรุงข้อมูลสถานศึกษา: ${db.schoolInfo.schoolName} (ผอ. ${db.schoolInfo.directorName}) ปีงบประมาณ ${db.schoolInfo.fiscalYear}`
    );

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลสถานศึกษาลงฐานข้อมูลเรียบร้อยแล้ว',
      data: db.schoolInfo,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
