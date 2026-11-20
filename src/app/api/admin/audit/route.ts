import { NextResponse } from 'next/server';
import { loadDatabase, recordAuditLog } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json(
      { success: true, data: db.auditLogs },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
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
    const { action, actorName, actorRole, targetName, details } = body;

    if (!action || !details) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูล Audit Log ไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const realActorName =
      actorName ||
      `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const realActorRole = actorRole || adminSession.user?.role || 'hr_admin';

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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
