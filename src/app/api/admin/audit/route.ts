import { NextResponse } from 'next/server';
import { loadDatabase, recordAuditLog } from '@/lib/db/serverDb';

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json({ success: true, data: db.auditLogs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, actorName, actorRole, targetName, details } = body;

    if (!action || !details) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูล Audit Log ไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const newLog = recordAuditLog(
      action,
      actorName || 'Superuser (นายธีรศักดิ์ มโนธรรม)',
      actorRole || 'superuser',
      targetName || 'ระบบส่วนกลาง',
      details
    );

    return NextResponse.json({ success: true, data: newLog });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
