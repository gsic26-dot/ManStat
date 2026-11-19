import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase, recordAuditLog } from '@/lib/db/serverDb';
import { getSessionUser, verifyAdminSession } from '@/lib/auth/serverAuth';
import type { LeaveRequestRecord } from '@/lib/data/schoolData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const db = loadDatabase();
    let list = db.leaveRequests || [];

    if (status) {
      list = list.filter((r) => r.status === status);
    }

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();
    if (!db.leaveRequests) {
      db.leaveRequests = [];
    }

    const { id } = body;
    let savedRequest: LeaveRequestRecord;
    let actionType = 'CREATE_LEAVE_REQUEST';

    const existingIndex = db.leaveRequests.findIndex((r) => r.id === id);

    if (existingIndex >= 0) {
      // Update existing request
      const existing = db.leaveRequests[existingIndex];
      savedRequest = {
        ...existing,
        ...body,
      };
      db.leaveRequests[existingIndex] = savedRequest;

      if (body.status === 'approved' && existing.status !== 'approved') {
        actionType = 'APPROVE_LEAVE_REQUEST';
      } else if (body.status === 'rejected' && existing.status !== 'rejected') {
        actionType = 'REJECT_LEAVE_REQUEST';
      } else {
        actionType = 'UPDATE_LEAVE_REQUEST';
      }
    } else {
      // Create new request
      const newId = id || `LEV-${new Date().getFullYear() + 543}-${String(db.leaveRequests.length + 1).padStart(3, '0')}`;
      savedRequest = {
        id: newId,
        docNo: body.docNo || `ศธ 04052.12/${String(db.leaveRequests.length + 50).padStart(3, '0')}`,
        teacherId: body.teacherId || 'TCH-001',
        teacherName: body.teacherName || 'ไม่ระบุชื่อ',
        position: body.position || 'ครู',
        department: body.department || 'ทั่วไป',
        leaveType: body.leaveType || 'sick',
        leaveTypeName: body.leaveTypeName || (body.leaveType === 'personal' ? 'ลากิจส่วนตัว' : 'ลาป่วย'),
        startDate: body.startDate || new Date().toISOString().split('T')[0],
        endDate: body.endDate || new Date().toISOString().split('T')[0],
        totalDays: body.totalDays ?? 1,
        reason: body.reason || '',
        substituteTeacherName: body.substituteTeacherName || 'ไม่ระบุ',
        status: body.status || 'pending',
        submittedAt: body.submittedAt || new Date().toISOString(),
        supervisorRemark: body.supervisorRemark || '',
        directorRemark: body.directorRemark || '',
        currentStep: body.currentStep ?? 1,
      };
      db.leaveRequests.unshift(savedRequest);
    }

    saveDatabase(db);

    const sessionUser = await getSessionUser();
    const actorName = sessionUser ? `${sessionUser.name} (${sessionUser.position})` : 'นายธีรศักดิ์ มโนธรรม (ผู้อำนวยการสถานศึกษา)';
    const actorRole = sessionUser?.role || 'superuser';

    recordAuditLog(
      actionType,
      actorName,
      actorRole,
      `${savedRequest.teacherName} (เลขที่ ${savedRequest.docNo})`,
      `${actionType === 'APPROVE_LEAVE_REQUEST' ? 'อนุมัติคำขอลา' : actionType === 'REJECT_LEAVE_REQUEST' ? 'ไม่อนุมัติคำขอลา' : 'บันทึกคำขอลา'}: ${savedRequest.leaveTypeName} (${savedRequest.startDate} ถึง ${savedRequest.endDate}) ${savedRequest.directorRemark ? `หมายเหตุ: ${savedRequest.directorRemark}` : ''}`
    );

    return NextResponse.json({
      success: true,
      message: 'บันทึกคำขอลาลงฐานข้อมูลเรียบร้อยแล้ว',
      data: savedRequest,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุ id ของคำขอลาที่ต้องการลบ' }, { status: 400 });
    }

    const db = loadDatabase();
    const target = (db.leaveRequests || []).find((r) => r.id === id);

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการคำขอลาที่ระบุ' }, { status: 404 });
    }

    db.leaveRequests = (db.leaveRequests || []).filter((r) => r.id !== id);
    saveDatabase(db);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_LEAVE_REQUEST',
      actorName,
      actorRole,
      `${target.teacherName} (เลขที่ ${target.docNo})`,
      `ลบคำร้องขอลา รหัส ${target.id} ออกจากระบบฐานข้อมูล`
    );

    return NextResponse.json({
      success: true,
      message: 'ลบคำร้องขอลาออกจากฐานข้อมูลเรียบร้อยแล้ว',
      data: { id },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
