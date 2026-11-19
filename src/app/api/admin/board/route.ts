import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog } from '@/lib/db/serverDb';
import type { BoardMemberRecord } from '@/lib/data/schoolData';

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json({ success: true, data: db.boardMembers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const member: BoardMemberRecord = body;

    if (!member || !member.fullName || !member.position) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลกรรมการสถานศึกษาไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const db = loadDatabase();
    const existingIndex = db.boardMembers.findIndex((b) => b.id === member.id);
    const isNew = existingIndex === -1;

    if (isNew) {
      db.boardMembers.push(member);
    } else {
      db.boardMembers[existingIndex] = {
        ...db.boardMembers[existingIndex],
        ...member,
      };
    }

    saveDatabase(db);

    recordAuditLog(
      isNew ? 'CREATE_BOARD_MEMBER' : 'UPDATE_BOARD_MEMBER',
      'Superuser (นายธีรศักดิ์ มโนธรรม)',
      'superuser',
      member.fullName,
      `${isNew ? 'เพิ่ม' : 'แก้ไข'}กรรมการสถานศึกษา: ${member.fullName} (${member.positionTitle})`
    );

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลคณะกรรมการสถานศึกษาเรียบร้อยแล้ว',
      data: isNew ? member : db.boardMembers[existingIndex],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing member id' }, { status: 400 });
    }

    const db = loadDatabase();
    const target = db.boardMembers.find((b) => b.id === id);

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบกรรมการสถานศึกษา' }, { status: 404 });
    }

    db.boardMembers = db.boardMembers.filter((b) => b.id !== id);
    saveDatabase(db);

    recordAuditLog(
      'DELETE_BOARD_MEMBER',
      'Superuser (นายธีรศักดิ์ มโนธรรม)',
      'superuser',
      target.fullName,
      `ลบกรรมการสถานศึกษา: ${target.fullName} (${target.positionTitle})`
    );

    return NextResponse.json({
      success: true,
      message: `ลบกรรมการสถานศึกษา ${target.fullName} เรียบร้อยแล้ว`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
