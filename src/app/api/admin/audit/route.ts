import { NextResponse } from 'next/server';
import { dbGetAuditLogs, recordAuditLog } from '@/lib/db/serverDb';
import { getSessionUser } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const logs = await dbGetAuditLogs(200);
    return NextResponse.json(
      { success: true, data: logs },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/audit GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล Audit Logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, actorName, actorRole, targetName, details } = body;

    if (!action || !details) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูล Audit Log ไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const realActorName =
      actorName ||
      `${sessionUser.name || 'ผู้ใช้งาน'} (${sessionUser.position || sessionUser.role || 'User'})`;
    const realActorRole = actorRole || sessionUser.role || 'teacher';

    const newLog = recordAuditLog(
      action,
      realActorName,
      realActorRole,
      targetName || 'ระบบส่วนกลาง',
      details
    );

    return NextResponse.json(
      { success: true, data: newLog },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/audit POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึก Audit Log' },
      { status: 500 }
    );
  }
}
