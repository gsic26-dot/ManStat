import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog, type SystemSettingsRecord } from '@/lib/db/serverDb';

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json({ success: true, data: db.settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updatedSettings: Partial<SystemSettingsRecord> = body;

    const db = loadDatabase();
    const oldSettings = { ...db.settings };
    db.settings = {
      ...db.settings,
      ...updatedSettings,
    };

    saveDatabase(db);

    recordAuditLog(
      'UPDATE_SYSTEM_SETTINGS',
      'Superuser (นายธีรศักดิ์ มโนธรรม)',
      'superuser',
      'การตั้งค่าระบบ (System Preferences)',
      `ปรับปรุงการตั้งค่าระบบ: Theme=${db.settings.themeMode}, View=${db.settings.preferredView}, MaskPDPA=${db.settings.maskCitizenId}`
    );

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าระบบลงฐานข้อมูลเรียบร้อยแล้ว',
      data: db.settings,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
