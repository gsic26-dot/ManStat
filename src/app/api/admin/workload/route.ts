import { NextResponse } from 'next/server';
import { dbGetWorkloads, dbUpsertWorkload, dbDeleteWorkload, recordAuditLog } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import type { WorkloadItem } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const workloads = await dbGetWorkloads();
    return NextResponse.json(
      { success: true, data: workloads },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/workload GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลภาระงาน' },
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
    const workload: WorkloadItem = body;

    if (!workload || !workload.title || !workload.category) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลภาระงานไม่ถูกต้อง (ต้องระบุ title และ category)' },
        { status: 400 }
      );
    }

    const saved = await dbUpsertWorkload(workload);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'UPDATE_WORKLOAD',
      actorName,
      actorRole,
      workload.teacherId,
      `บันทึกภาระงาน: ${workload.title} (${workload.hoursPerWeek} ชม./สัปดาห์) [${workload.category}]`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกข้อมูลภาระงานเรียบร้อยแล้ว',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/workload POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลภาระงาน' },
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
      return NextResponse.json({ success: false, error: 'Missing workload id' }, { status: 400 });
    }

    await dbDeleteWorkload(id);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_WORKLOAD',
      actorName,
      actorRole,
      id,
      `ลบรายการภาระงานรหัส ${id}`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'ลบรายการภาระงานเรียบร้อยแล้ว',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/workload DELETE Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบรายการภาระงาน' },
      { status: 500 }
    );
  }
}
