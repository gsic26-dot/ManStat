import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog } from '@/lib/db/serverDb';
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
    const body = await request.json();
    const updatedInfo: Partial<SchoolInfoRecord> = body;

    const db = loadDatabase();
    db.schoolInfo = {
      ...db.schoolInfo,
      ...updatedInfo,
    };

    saveDatabase(db);

    recordAuditLog(
      'UPDATE_SCHOOL_INFO',
      'Superuser (นายธีรศักดิ์ มโนธรรม)',
      'superuser',
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
