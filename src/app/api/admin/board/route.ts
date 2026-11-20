import { NextResponse } from 'next/server';
import {
  dbGetBoardMembers,
  dbUpsertBoardMember,
  dbDeleteBoardMember,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
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
    b.position_title ||
    BOARD_POSITIONS_MAP[position] ||
    'กรรมการสถานศึกษา';
  const fullName =
    b.fullName ||
    b.full_name ||
    `${b.prefix || ''}${b.first_name || ''} ${b.last_name || ''}`.trim() ||
    '-';

  const isExOfficio =
    b.isExOfficio !== undefined
      ? Boolean(b.isExOfficio)
      : b.is_ex_officio !== undefined
      ? Boolean(b.is_ex_officio)
      : position === 'DIRECTOR_SEC';

  const endReason = b.endReason || b.end_reason || '';

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
    isExOfficio,
    appointmentDate: b.appointmentDate || b.appointment_date || '',
    endDate: b.endDate || b.end_date || '',
    endReason,
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rawList = await dbGetBoardMembers();
    const normalized = rawList.map(normalizeMember);
    return NextResponse.json(
      { success: true, data: normalized },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/board GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลคณะกรรมการสถานศึกษา' },
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
    const member: BoardMemberRecord = normalizeMember(body);

    if (!member || !member.fullName || member.fullName === '-') {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลกรรมการสถานศึกษาไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const currentMembers = await dbGetBoardMembers();
    const existingIndex = currentMembers.findIndex(
      (b: any) => b.id === member.id || b.member_id === member.id
    );
    const isNew = existingIndex === -1;

    const saved = await dbUpsertBoardMember(member);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      isNew ? 'CREATE_BOARD_MEMBER' : 'UPDATE_BOARD_MEMBER',
      actorName,
      actorRole,
      member.fullName,
      `${isNew ? 'เพิ่ม' : 'แก้ไข'}กรรมการสถานศึกษา: ${member.fullName} (${member.positionTitle})${member.isExOfficio ? ' [โดยตำแหน่ง]' : ''}`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกข้อมูลคณะกรรมการสถานศึกษาเรียบร้อยแล้ว',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/board POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลคณะกรรมการสถานศึกษา' },
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
      return NextResponse.json({ success: false, error: 'Missing member id' }, { status: 400 });
    }

    const currentMembers = await dbGetBoardMembers();
    const target = currentMembers.find((b: any) => b.id === id || b.member_id === id);

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบกรรมการสถานศึกษา' }, { status: 404 });
    }

    await dbDeleteBoardMember(id);

    const name = target.fullName || id;
    const title = target.positionTitle || 'กรรมการสถานศึกษา';

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_BOARD_MEMBER',
      actorName,
      actorRole,
      name,
      `ลบกรรมการสถานศึกษา: ${name} (${title})`
    );

    return NextResponse.json(
      {
        success: true,
        message: `ลบกรรมการสถานศึกษา ${name} เรียบร้อยแล้ว`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/board DELETE Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูลคณะกรรมการสถานศึกษา' },
      { status: 500 }
    );
  }
}
