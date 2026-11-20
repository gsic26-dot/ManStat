import { NextResponse } from 'next/server';
import { dbGetScouts, dbUpsertScout, dbDeleteScout, recordAuditLog } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import type { ScoutRecord } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const scouts = await dbGetScouts();
    return NextResponse.json(
      { success: true, data: scouts },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/scout GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลทะเบียนวุฒิลูกเสือ' },
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
    const scout: ScoutRecord = body;

    if (!scout || !scout.qualification) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลวุฒิลูกเสือไม่ถูกต้อง (ต้องระบุ qualification)' },
        { status: 400 }
      );
    }

    const saved = await dbUpsertScout(scout);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'UPDATE_SCOUT',
      actorName,
      actorRole,
      scout.teacherName || scout.qualification,
      `บันทึกวุฒิลูกเสือ: ${scout.qualification} (เลขที่: ${scout.certificateNo || '-'})`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกข้อมูลวุฒิลูกเสือเรียบร้อยแล้ว',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/scout POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกวุฒิลูกเสือ' },
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
      return NextResponse.json({ success: false, error: 'Missing scout id' }, { status: 400 });
    }

    await dbDeleteScout(id);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_SCOUT',
      actorName,
      actorRole,
      id,
      `ลบข้อมูลวุฒิลูกเสือรหัส ${id}`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'ลบข้อมูลวุฒิลูกเสือเรียบร้อยแล้ว',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/scout DELETE Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูลวุฒิลูกเสือ' },
      { status: 500 }
    );
  }
}
