import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/serverAuth';
import { canViewSensitiveData } from '@/lib/auth/roles';
import { dbGetTeachers, recordAuditLog } from '@/lib/db/serverDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { targetStaffId, fieldType } = body as {
      targetStaffId: string;
      fieldType: 'citizen_id' | 'phone' | 'salary' | 'sick_reason';
    };

    if (!targetStaffId || !fieldType) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลคำขอไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const teachers = await dbGetTeachers();
    const target = teachers.find(
      (t) => t.id === targetStaffId || t.employeeCode === targetStaffId
    );

    if (!target) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบบุคลากรที่ระบุ' },
        { status: 404 }
      );
    }

    const check = canViewSensitiveData(sessionUser, target);
    if (!check.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            check.reason ||
            'สงวนสิทธิ์เฉพาะเจ้าของข้อมูลและงานบุคคล ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)',
        },
        { status: 403 }
      );
    }

    let unmaskedValue = '';
    let fieldNameThai = '';

    switch (fieldType) {
      case 'citizen_id':
        unmaskedValue = target.idCard || target.maskedCitizenId || '';
        fieldNameThai = 'เลขประจำตัวประชาชน 13 หลัก';
        break;
      case 'phone':
        unmaskedValue = target.phone || '';
        fieldNameThai = 'เบอร์โทรศัพท์ส่วนตัว';
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'ประเภทข้อมูลไม่ถูกต้อง' },
          { status: 400 }
        );
    }

    // Record PDPA Audit Log
    const actionType = check.isSelf ? 'PDPA_UNMASK_SELF' : 'PDPA_UNMASK_OTHER';
    const actorLabel = `${sessionUser.name} (${sessionUser.position || sessionUser.role})`;
    const targetLabel = `${target.name} (${target.position})`;
    const details = `เปิดดู${fieldNameThai} (${check.isSelf ? 'เจ้าของข้อมูลเปิดดูเอง' : 'เจ้าหน้าที่/ผู้บริหารเข้าถึง'})`;

    recordAuditLog(
      actionType,
      actorLabel,
      sessionUser.role,
      targetLabel,
      details
    );

    return NextResponse.json({
      success: true,
      value: unmaskedValue,
      isSelf: check.isSelf,
      expiresInSeconds: 45,
    });
  } catch (err: any) {
    console.error('[API /api/pdpa/reveal Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการเปิดดูข้อมูล PDPA' },
      { status: 500 }
    );
  }
}
