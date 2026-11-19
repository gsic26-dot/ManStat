import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog, type HolidayRecord } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json({ success: true, data: db.holidays });
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
    const { name, date, type = 'วันหยุดพิเศษ / ตามมติ ครม.' } = body;

    if (!name || !date) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุชื่อวันหยุดและวันที่' },
        { status: 400 }
      );
    }

    const db = loadDatabase();
    const newHoliday: HolidayRecord = {
      id: `h-${Date.now()}`,
      date,
      name,
      type,
    };

    db.holidays.push(newHoliday);
    // Sort by date ascending
    db.holidays.sort((a, b) => a.date.localeCompare(b.date));

    saveDatabase(db);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'ADD_HOLIDAY',
      actorName,
      actorRole,
      name,
      `เพิ่มวันหยุดราชการ: ${name} (${date})`
    );

    return NextResponse.json({
      success: true,
      message: 'เพิ่มวันหยุดราชการเรียบร้อยแล้ว',
      data: db.holidays,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminSession = await verifyAdminSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing holiday id' }, { status: 400 });
    }

    const db = loadDatabase();
    const target = db.holidays.find((h) => h.id === id);

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบวันหยุดที่ต้องการลบ' }, { status: 404 });
    }

    db.holidays = db.holidays.filter((h) => h.id !== id);
    saveDatabase(db);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_HOLIDAY',
      actorName,
      actorRole,
      target.name,
      `ลบวันหยุดราชการ: ${target.name} (${target.date})`
    );

    return NextResponse.json({
      success: true,
      message: `ลบวันหยุด ${target.name} เรียบร้อยแล้ว`,
      data: db.holidays,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
