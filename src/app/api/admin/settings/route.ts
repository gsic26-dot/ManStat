import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog, type SystemSettingsRecord } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';

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
    const adminSession = await verifyAdminSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json();
    const updatedSettings: Partial<SystemSettingsRecord> = body;

    const db = loadDatabase();
    db.settings = {
      ...db.settings,
      ...updatedSettings,
    };

    saveDatabase(db);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'UPDATE_SYSTEM_SETTINGS',
      actorName,
      actorRole,
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
