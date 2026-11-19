import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog } from '@/lib/db/serverDb';
import type { TeacherRecord } from '@/lib/data/schoolData';

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json({ success: true, data: db.teachers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updatedStaff: TeacherRecord = body;

    if (!updatedStaff || (!updatedStaff.id && !updatedStaff.employeeCode)) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลบุคลากรไม่ถูกต้อง (ต้องมี id หรือ employeeCode)' },
        { status: 400 }
      );
    }

    const db = loadDatabase();
    const existingIndex = db.teachers.findIndex(
      (t) => t.id === updatedStaff.id || t.employeeCode === updatedStaff.employeeCode
    );

    const isNew = existingIndex === -1;
    let oldStaff: TeacherRecord | null = null;

    if (isNew) {
      db.teachers.unshift(updatedStaff);
    } else {
      oldStaff = db.teachers[existingIndex];
      db.teachers[existingIndex] = {
        ...oldStaff,
        ...updatedStaff,
        standings: updatedStaff.standings || oldStaff.standings || [],
        licenses: updatedStaff.licenses || oldStaff.licenses || [],
        educations: updatedStaff.educations || oldStaff.educations || [],
      };
    }

    // Save persistent database
    saveDatabase(db);

    // Record Immutable PDPA Audit Log
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

    recordAuditLog(
      isNew ? 'CREATE_STAFF' : 'UPDATE_STAFF',
      'Superuser (นายธีรศักดิ์ มโนธรรม)',
      'superuser',
      updatedStaff.name,
      changes.join(', ')
    );

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลบุคลากรลงฐานข้อมูลเรียบร้อยแล้ว',
      data: isNew ? updatedStaff : db.teachers[existingIndex],
    });
  } catch (err: any) {
    console.error('[API /api/admin/staff POST Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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

    recordAuditLog(
      'DELETE_STAFF',
      'Superuser (นายธีรศักดิ์ มโนธรรม)',
      'superuser',
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
