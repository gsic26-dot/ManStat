import { NextResponse } from 'next/server';
import {
  dbGetWorkloads,
  dbGetTeachers,
  dbInsertWorkloadsBatch,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import { buildRolloverWorkloads } from '@/lib/regulations/workload-rollover';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const adminSession = await verifyAdminSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const sourceYear = String(body?.sourceYear || '').trim();
    const targetYear = String(body?.targetYear || '').trim();
    const includeAdminRoles = body?.includeAdminRoles !== false;
    const includeAdhocProjects = Boolean(body?.includeAdhocProjects);

    if (!sourceYear || !targetYear) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุปีการศึกษาต้นทางและปีการศึกษาปลายทางให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (sourceYear === targetYear) {
      return NextResponse.json(
        { success: false, error: 'ปีการศึกษาต้นทางและปีการศึกษาปลายทางต้องไม่ซ้ำกัน' },
        { status: 400 }
      );
    }

    if (!includeAdminRoles && !includeAdhocProjects) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกประเภทภาระงานอย่างน้อย 1 ประเภทเพื่อคัดลอก' },
        { status: 400 }
      );
    }

    const [existingWorkloads, activeTeachers] = await Promise.all([
      dbGetWorkloads(),
      dbGetTeachers(),
    ]);

    const { recordsToCreate, skippedDuplicates, skippedInactiveStaff } = buildRolloverWorkloads({
      sourceYear,
      targetYear,
      existingWorkloads,
      activeTeachers,
      includeAdminRoles,
      includeAdhocProjects,
    });

    const created = await dbInsertWorkloadsBatch(recordsToCreate);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'ROLLOVER_WORKLOAD',
      actorName,
      actorRole,
      `${sourceYear}->${targetYear}`,
      `คัดลอกโครงสร้างงานจากปีการศึกษา ${sourceYear} ไปยัง ${targetYear}: สร้างใหม่ ${created.length} รายการ (ข้ามซ้ำ ${skippedDuplicates}, บุคลากรพ้นสภาพ ${skippedInactiveStaff})`
    );

    return NextResponse.json(
      {
        success: true,
        message: `คัดลอกโครงสร้างงานไปยังปีการศึกษา ${targetYear} เรียบร้อยแล้ว`,
        data: {
          created,
          createdCount: created.length,
          skippedDuplicates,
          skippedInactiveStaff,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการคัดลอกโครงสร้างงานข้ามปีการศึกษา';
    console.error('[API /api/admin/workload/rollover POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
