import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog } from '@/lib/db/serverDb';
import type { BoardMemberRecord } from '@/lib/data/schoolData';

const BOARD_POSITIONS_MAP: Record<string, string> = {
  CHAIR: 'ประธานกรรมการ',
  PARENT_REP: 'ผู้แทนผู้ปกครอง',
  TEACHER_REP: 'ผู้แทนครู',
  COMMUNITY_REP: 'ผู้แทนองค์กรชุมชน',
  LOCAL_ADMIN: 'ผู้แทนองค์กรปกครองส่วนท้องถิ่น',
  ALUMNI_REP: 'ผู้แทนศิษย์เก่า',
  RELIGION_REP: 'ผู้แทนพระภิกษุสงฆ์ / ศาสนา',
  EXPERT: 'กรรมการผู้ทรงคุณวุฒิ',
  DIRECTOR_SEC: 'กรรมการและเลขานุการ',
};

function normalizeMember(b: any): BoardMemberRecord {
  const position = b.position || b.board_position || 'EXPERT';
  const positionTitle =
    b.positionTitle ||
    BOARD_POSITIONS_MAP[position] ||
    'กรรมการสถานศึกษา';
  const fullName =
    b.fullName ||
    b.full_name ||
    `${b.prefix || ''}${b.first_name || ''} ${b.last_name || ''}`.trim() ||
    '-';

  return {
    id: b.id || b.member_id || `SBD-${Math.random().toString(36).substring(2, 7)}`,
    fullName,
    position,
    positionTitle,
    occupation: b.occupation || '-',
    organization: b.organization || '-',
    phone: b.phone || '-',
    status: b.status || 'ดำรงตำแหน่ง',
    termNumber: b.termNumber ?? b.term_number ?? 1,
  };
}

export async function GET() {
  try {
    const db = loadDatabase();
    const rawList = db.boardMembers || [];
    const normalized = rawList.map(normalizeMember);
    return NextResponse.json({ success: true, data: normalized });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const member: BoardMemberRecord = normalizeMember(body);

    if (!member || !member.fullName || member.fullName === '-') {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลกรรมการสถานศึกษาไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const db = loadDatabase();
    if (!db.boardMembers) db.boardMembers = [];

    const existingIndex = db.boardMembers.findIndex(
      (b: any) => (b.id && b.id === member.id) || (b.member_id && b.member_id === member.id)
    );
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
      data: isNew ? member : normalizeMember(db.boardMembers[existingIndex]),
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
    const target = (db.boardMembers || []).find(
      (b: any) => b.id === id || b.member_id === id
    );

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบกรรมการสถานศึกษา' }, { status: 404 });
    }

    db.boardMembers = (db.boardMembers || []).filter(
      (b: any) => b.id !== id && b.member_id !== id
    );
    saveDatabase(db);

    const name = (target as any).fullName || (target as any).full_name || id;
    const title = (target as any).positionTitle || (target as any).board_position || 'กรรมการสถานศึกษา';

    recordAuditLog(
      'DELETE_BOARD_MEMBER',
      'Superuser (นายธีรศักดิ์ มโนธรรม)',
      'superuser',
      name,
      `ลบกรรมการสถานศึกษา: ${name} (${title})`
    );

    return NextResponse.json({
      success: true,
      message: `ลบกรรมการสถานศึกษา ${name} เรียบร้อยแล้ว`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
