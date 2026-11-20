import { NextResponse } from 'next/server';
import {
  dbGetHolidays,
  dbAddHoliday,
  dbDeleteHoliday,
  recordAuditLog,
  type HolidayRecord,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const holidays = await dbGetHolidays();
    return NextResponse.json(
      { success: true, data: holidays },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/holidays GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลวันหยุดราชการ' },
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
    const { name, date, type = 'วันหยุดพิเศษ / ตามมติ ครม.' } = body;

    if (!name || !date) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุชื่อวันหยุดและวันที่' },
        { status: 400 }
      );
    }

    const newHoliday: HolidayRecord = {
      id: `h-${Date.now()}`,
      date,
      name,
      type,
    };

    await dbAddHoliday(newHoliday);
    const updatedHolidays = await dbGetHolidays();

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'ADD_HOLIDAY',
      actorName,
      actorRole,
      name,
      `เพิ่มวันหยุดราชการ: ${name} (${date})`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'เพิ่มวันหยุดราชการเรียบร้อยแล้ว',
        data: updatedHolidays,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/holidays POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการเพิ่มวันหยุดราชการ' },
      { status: 500 }
    );
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

    const currentHolidays = await dbGetHolidays();
    const target = currentHolidays.find((h) => h.id === id);

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบวันหยุดที่ต้องการลบ' }, { status: 404 });
    }

    await dbDeleteHoliday(id);
    const updatedHolidays = await dbGetHolidays();

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_HOLIDAY',
      actorName,
      actorRole,
      target.name,
      `ลบวันหยุดราชการ: ${target.name} (${target.date})`
    );

    return NextResponse.json(
      {
        success: true,
        message: `ลบวันหยุด ${target.name} เรียบร้อยแล้ว`,
        data: updatedHolidays,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/holidays DELETE Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบวันหยุดราชการ' },
      { status: 500 }
    );
  }
}
