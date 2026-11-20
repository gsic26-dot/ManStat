import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog } from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import { mapAccessLevelToRole } from '@/lib/auth/roles';
import type { TeacherRecord } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json(
      { success: true, data: db.teachers },
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

    const db = loadDatabase();
    // Match row by id primarily, match employeeCode only when non-empty
    const existingIndex = db.teachers.findIndex((t) => {
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
      oldStaff = db.teachers[existingIndex];
    }

    // Map and synchronize role with accessLevel
    const mappedRole = mapAccessLevelToRole(updatedStaff.accessLevel);
    const staffToSave: TeacherRecord = {
      ...(oldStaff || {}),
      ...updatedStaff,
      accessLevel: updatedStaff.accessLevel || 'User',
      role: mappedRole,
      standings: updatedStaff.standings || oldStaff?.standings || [],
      licenses: updatedStaff.licenses || oldStaff?.licenses || [],
      educations: updatedStaff.educations || oldStaff?.educations || [],
    };

    if (isNew) {
      db.teachers.unshift(staffToSave);
    } else {
      db.teachers[existingIndex] = staffToSave;
    }

    // Save persistent database
    saveDatabase(db);

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
      if (oldStaff.position !== updatedStaff.position) {
        changes.push(`เปลี่ยนตำแหน่ง: ${oldStaff.position} -> ${updatedStaff.position}`);
      }
      if (oldStaff.department !== updatedStaff.department) {
        changes.push(`เปลี่ยนกลุ่มสาระฯ: ${oldStaff.department} -> ${updatedStaff.department}`);
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

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลบุคลากรลงฐานข้อมูลเรียบร้อยแล้ว',
      data: staffToSave,
    });
  } catch (err: any) {
    console.error('[API /api/admin/staff POST Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
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

    const db = loadDatabase();
    const target = db.teachers.find((t) => t.id === id);

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบบุคลากรที่ต้องการลบ' }, { status: 404 });
    }

    db.teachers = db.teachers.filter((t) => t.id !== id);
    saveDatabase(db);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_STAFF',
      actorName,
      actorRole,
      target.name,
      `ลบข้อมูลบุคลากร ${target.name} (${target.position}) ออกจากระบบ`
    );

    return NextResponse.json({
      success: true,
      message: `ลบข้อมูลบุคลากร ${target.name} เรียบร้อยแล้ว`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
