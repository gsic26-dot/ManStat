import { NextResponse } from 'next/server';
import {
  dbGetLeaveRequests,
  dbUpsertLeaveRequest,
  dbDeleteLeaveRequest,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { getSessionUser, verifyAdminSession } from '@/lib/auth/serverAuth';
import { isAdminRole, sanitizeLeaveForViewer } from '@/lib/auth/roles';
import type { LeaveRequestRecord } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const [list, sessionUser] = await Promise.all([
      dbGetLeaveRequests(status),
      getSessionUser(),
    ]);

    // Server-Side PDPA Section 26 Sanitization: Mask sick leave medical reasons for third parties
    const sanitizedList = list.map((req) => sanitizeLeaveForViewer(req, sessionUser));

    return NextResponse.json(
      { success: true, data: sanitizedList },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/leave GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอลา' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' },
        { status: 401 }
      );
    }

    const isUserAdmin = isAdminRole(sessionUser.role);
    const body = await request.json();
    const { id } = body;

    const currentRequests = await dbGetLeaveRequests();
    let savedRequest: LeaveRequestRecord;
    let actionType = 'CREATE_LEAVE_REQUEST';

    const existingIndex = currentRequests.findIndex((r) => r.id === id);

    if (existingIndex >= 0) {
      // Update existing request
      const existing = currentRequests[existingIndex];
      const isApprovingOrRejecting =
        (body.status === 'approved' && existing.status !== 'approved') ||
        (body.status === 'rejected' && existing.status !== 'rejected') ||
        (body.status === 'supervisor_approved' && existing.status !== 'supervisor_approved');

      // RBAC Guard: Only Admin/Director/Superuser can approve or reject leave requests
      if (isApprovingOrRejecting && !isUserAdmin) {
        return NextResponse.json(
          { success: false, error: 'สงวนสิทธิ์เฉพาะผู้บริหารและผู้ดูแลระบบในการอนุมัติหรือไม่อนุมัติใบลา' },
          { status: 403 }
        );
      }

      // RBAC Guard: Regular teachers can only edit their own pending leave requests
      const isOwner =
        existing.teacherId === sessionUser.id ||
        existing.teacherId === sessionUser.employeeCode;
      if (!isUserAdmin && (!isOwner || existing.status !== 'pending')) {
        return NextResponse.json(
          { success: false, error: 'ไม่มีสิทธิ์แก้ไขใบลาของผู้อื่น หรือใบลาที่อนุมัติแล้ว' },
          { status: 403 }
        );
      }

      savedRequest = {
        ...existing,
        ...body,
        // Prevent non-admin from escalating status
        status: isUserAdmin ? (body.status || existing.status) : existing.status,
      };

      if (body.status === 'approved' && existing.status !== 'approved') {
        actionType = 'APPROVE_LEAVE_REQUEST';
      } else if (body.status === 'rejected' && existing.status !== 'rejected') {
        actionType = 'REJECT_LEAVE_REQUEST';
      } else {
        actionType = 'UPDATE_LEAVE_REQUEST';
      }
    } else {
      // Create new request
      // RBAC Guard: Only Admin/HR can directly create an already-approved leave (e.g. retroactive leave) or create for another staff member
      const targetTeacherId = body.teacherId || sessionUser.id || 'TCH-001';
      const isSelfRequest =
        targetTeacherId === sessionUser.id ||
        targetTeacherId === sessionUser.employeeCode;

      if (!isUserAdmin && !isSelfRequest) {
        return NextResponse.json(
          { success: false, error: 'ไม่สามารถยื่นใบลาแทนบุคลากรท่านอื่นได้' },
          { status: 403 }
        );
      }

      const requestedStatus = body.status || 'pending';
      if (!isUserAdmin && requestedStatus !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'การยื่นใบลาปกติจะต้องเริ่มต้นด้วยสถานะรอพิจารณา (pending) เท่านั้น' },
          { status: 403 }
        );
      }

      const newId =
        id || `LEV-${new Date().getFullYear() + 543}-${String(currentRequests.length + 1).padStart(3, '0')}`;
      savedRequest = {
        id: newId,
        docNo: body.docNo || `ศธ 04052.12/${String(currentRequests.length + 50).padStart(3, '0')}`,
        teacherId: targetTeacherId,
        teacherName: body.teacherName || sessionUser.name || 'ไม่ระบุชื่อ',
        position: body.position || sessionUser.position || 'ครู',
        department: body.department || sessionUser.department || 'ทั่วไป',
        leaveType: body.leaveType || 'sick',
        leaveTypeName: body.leaveTypeName || (body.leaveType === 'personal' ? 'ลากิจส่วนตัว' : 'ลาป่วย'),
        startDate: body.startDate || new Date().toISOString().split('T')[0],
        endDate: body.endDate || new Date().toISOString().split('T')[0],
        totalDays: body.totalDays ?? 1,
        startTime: body.startTime || '',
        endTime: body.endTime || '',
        totalHours: body.totalHours ?? 0,
        place: body.place || body.destination || '',
        reason: body.reason || '',
        substituteTeacherName: body.substituteTeacherName || 'ไม่ระบุ',
        workloadJson: body.workloadJson || body.workloads || [],
        status: isUserAdmin ? requestedStatus : 'pending',
        submittedAt: body.submittedAt || new Date().toISOString(),
        supervisorRemark: body.supervisorRemark || '',
        directorRemark: body.directorRemark || '',
        currentStep: body.currentStep ?? 1,
      };
    }

    const saved = await dbUpsertLeaveRequest(savedRequest);

    const actorName = `${sessionUser.name} (${sessionUser.position})`;
    const actorRole = sessionUser.role;

    recordAuditLog(
      actionType,
      actorName,
      actorRole,
      `${saved.teacherName} (เลขที่ ${saved.docNo})`,
      `${actionType === 'APPROVE_LEAVE_REQUEST' ? 'อนุมัติคำขอลา' : actionType === 'REJECT_LEAVE_REQUEST' ? 'ไม่อนุมัติคำขอลา' : 'บันทึกคำขอลา'}: ${saved.leaveTypeName} (${saved.startDate} ถึง ${saved.endDate}) ${saved.directorRemark ? `หมายเหตุ: ${saved.directorRemark}` : ''}`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกคำขอลาลงฐานข้อมูลเรียบร้อยแล้ว',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/leave POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกคำขอลา' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function PATCH(request: Request) {
  return POST(request);
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

    const currentRequests = await dbGetLeaveRequests();
    const target = currentRequests.find((r) => r.id === id);

    if (!target) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการคำขอลาที่ระบุ' }, { status: 404 });
    }

    await dbDeleteLeaveRequest(id);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    recordAuditLog(
      'DELETE_LEAVE_REQUEST',
      actorName,
      actorRole,
      `${target.teacherName} (เลขที่ ${target.docNo})`,
      `ลบคำร้องขอลา รหัส ${target.id} ออกจากระบบฐานข้อมูล`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'ลบคำร้องขอลาออกจากฐานข้อมูลเรียบร้อยแล้ว',
        data: { id },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/leave DELETE Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบคำขอลา' },
      { status: 500 }
    );
  }
}
