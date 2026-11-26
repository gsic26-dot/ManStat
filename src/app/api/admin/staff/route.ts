import { NextResponse } from 'next/server';
import { dbGetTeachers, dbUpsertTeacher, dbDeleteTeacher, recordAuditLog } from '@/lib/db/serverDb';
import { getSessionUser, verifyAdminSession } from '@/lib/auth/serverAuth';
import { mapAccessLevelToRole, sanitizeStaffForViewer } from '@/lib/auth/roles';
import type { TeacherRecord } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [teachers, sessionUser] = await Promise.all([
      dbGetTeachers(),
      getSessionUser(),
    ]);

    // Server-Side PDPA Sanitization: Strip raw 13-digit idCard & mask phone for unauthorized viewers
    const sanitizedTeachers = teachers.map((t) => sanitizeStaffForViewer(t, sessionUser));

    return NextResponse.json(
      { success: true, data: sanitizedTeachers },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/staff GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลบุคลากร' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Verify administrative privileges
    const adminSession = await verifyAdminSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json();
    const updatedStaff: TeacherRecord = body;

    if (!updatedStaff || (!updatedStaff.id && !updatedStaff.employeeCode)) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลบุคลากรไม่ถูกต้อง (ต้องมี id หรือ employeeCode)' },
        { status: 400 }
      );
    }

    const currentTeachers = await dbGetTeachers();
    // Match row by id primarily, match employeeCode only when non-empty
    const existingIndex = currentTeachers.findIndex((t) => {
      if (updatedStaff.id && t.id === updatedStaff.id) return true;
      if (
        updatedStaff.employeeCode &&
        updatedStaff.employeeCode.trim() !== '' &&
        t.employeeCode &&
        t.employeeCode.trim() !== '' &&
        t.employeeCode === updatedStaff.employeeCode
      ) {
        return true;
      }
      return false;
    });

    const isNew = existingIndex === -1;
    let oldStaff: TeacherRecord | null = null;
    if (!isNew) {
      oldStaff = currentTeachers[existingIndex];
    }

    // Map and synchronize role with accessLevel
    const mappedRole = mapAccessLevelToRole(updatedStaff.accessLevel);
    const staffToSave: TeacherRecord = {
      ...(oldStaff || {}),
      ...updatedStaff,
      id: updatedStaff.id || updatedStaff.employeeCode || `TCH-${Date.now()}`,
      accessLevel: updatedStaff.accessLevel || 'User',
      role: mappedRole,
      major:
        updatedStaff.major !== undefined
          ? updatedStaff.major?.trim() || null
          : oldStaff?.major || null,
      currentPositionDate:
        updatedStaff.currentPositionDate !== undefined
          ? updatedStaff.currentPositionDate?.trim() || null
          : oldStaff?.currentPositionDate || null,
      // Statutory leave balances are derived from approved leave requests; never manually overridden here
      sickUsed: oldStaff?.sickUsed ?? updatedStaff.sickUsed ?? 0,
      personalUsed: oldStaff?.personalUsed ?? updatedStaff.personalUsed ?? 0,
      vacationUsed: oldStaff?.vacationUsed ?? updatedStaff.vacationUsed ?? 0,
      standings: updatedStaff.standings || oldStaff?.standings || [],
      licenses: updatedStaff.licenses || oldStaff?.licenses || [],
      educations: updatedStaff.educations || oldStaff?.educations || [],
    };

    // Save directly to Relational Supabase / Server DB (throws if error)
    const saved = await dbUpsertTeacher(staffToSave);

    // Record Immutable PDPA Audit Log with actual authenticated admin identity
    const changes: string[] = [];
    if (isNew) {
      changes.push(`เพิ่มบุคลากรใหม่: ${updatedStaff.name} (${updatedStaff.position})`);
    } else if (oldStaff) {
      if (oldStaff.accessLevel !== updatedStaff.accessLevel) {
        changes.push(`เปลี่ยนสิทธิ์: ${oldStaff.accessLevel || 'User'} -> ${updatedStaff.accessLevel}`);
      }
      if (oldStaff.academicStanding !== updatedStaff.academicStanding) {
        changes.push(`เปลี่ยนวิทยฐานะ: ${oldStaff.academicStanding} -> ${updatedStaff.academicStanding}`);
      }
      if (oldStaff.employment_type !== updatedStaff.employment_type) {
        changes.push(`เปลี่ยนประเภทบุคลากร: ${oldStaff.employment_type || 'civil_servant'} -> ${updatedStaff.employment_type}`);
      }
      if (oldStaff.position !== updatedStaff.position) {
        changes.push(`เปลี่ยนตำแหน่ง: ${oldStaff.position} -> ${updatedStaff.position}`);
      }
      if (oldStaff.department !== updatedStaff.department) {
        changes.push(`เปลี่ยนกลุ่มสาระฯ: ${oldStaff.department} -> ${updatedStaff.department}`);
      }
      if ((oldStaff.major || '') !== (staffToSave.major || '')) {
        changes.push(`เปลี่ยนวิชาเอก: ${oldStaff.major || '-'} -> ${staffToSave.major || '-'}`);
      }
      if ((oldStaff.currentPositionDate || '') !== (staffToSave.currentPositionDate || '')) {
        changes.push(
          `เปลี่ยนวันที่ดำรงตำแหน่งปัจจุบัน: ${oldStaff.currentPositionDate || '-'} -> ${staffToSave.currentPositionDate || '-'}`
        );
      }
      if (changes.length === 0) {
        changes.push(`แก้ไขข้อมูลทั่วไปของ ${updatedStaff.name}`);
      }
    }

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      isNew ? 'CREATE_STAFF' : 'UPDATE_STAFF',
      actorName,
      actorRole,
      updatedStaff.name,
      changes.join(', ')
    );

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกข้อมูลบุคลากรลงฐานข้อมูลเรียบร้อยแล้ว',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/staff POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลบุคลากร' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    // 1. Verify administrative privileges
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
      return NextResponse.json({ success: false, error: 'Missing staff id' }, { status: 400 });
    }

    const currentTeachers = await dbGetTeachers();
    const target = currentTeachers.find((t) => t.id === id);

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบบุคลากรที่ต้องการลบ' }, { status: 404 });
    }

    // Delete directly from Relational Supabase / Server DB (throws if error)
    await dbDeleteTeacher(id);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_STAFF',
      actorName,
      actorRole,
      target.name,
      `ลบข้อมูลบุคลากร ${target.name} (${target.position}) ออกจากระบบ`
    );

    return NextResponse.json(
      {
        success: true,
        message: `ลบข้อมูลบุคลากร ${target.name} เรียบร้อยแล้ว`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/staff DELETE Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูลบุคลากร' },
      { status: 500 }
    );
  }
}
