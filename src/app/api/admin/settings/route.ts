import { NextResponse } from 'next/server';
import {
  dbGetSettings,
  dbSaveSettings,
  recordAuditLog,
  type SystemSettingsRecord,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await dbGetSettings();
    return NextResponse.json(
      { success: true, data: settings },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/settings GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่าระบบ' },
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
    const updatedSettings: Partial<SystemSettingsRecord> = body;

    const saved = await dbSaveSettings(updatedSettings);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'UPDATE_SYSTEM_SETTINGS',
      actorName,
      actorRole,
      'การตั้งค่าระบบ (System Preferences)',
      `ปรับปรุงการตั้งค่าระบบ: Theme=${saved.themeMode}, View=${saved.preferredView}, MaskPDPA=${saved.maskCitizenId}, FiscalYear=${saved.fiscalYear}`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกการตั้งค่าระบบลงฐานข้อมูลเรียบร้อยแล้ว',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/settings POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่าระบบ' },
      { status: 500 }
    );
  }
}
