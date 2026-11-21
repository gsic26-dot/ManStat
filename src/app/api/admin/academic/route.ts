import { NextResponse } from 'next/server';
import {
  dbGetAcademicYears,
  dbGetStudentCensusSnapshots,
  dbGetFiscalPeriods,
  dbSetActiveAcademicYear,
  dbCreateAcademicYearWithDefaults,
  dbSetPrimaryCensusRound,
  dbSetActiveFiscalPeriod,
  dbSaveCensusSnapshot,
  dbCreateFiscalPeriod,
  dbUpdateFiscalPeriod,
  dbGetSalaryPromotionRecords,
  dbSaveSalaryPromotionRecord,
  dbSnapshotStaffForFiscalPeriod,
  dbGetTeachers,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyAdminSession } from '@/lib/auth/serverAuth';
import type { StudentCensusSnapshotRecord, SalaryPromotionRecord } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') || '30030099';
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const fiscalPeriodId = searchParams.get('fiscalPeriodId') || undefined;

    const [academicYears, censusSnapshots, fiscalPeriods, salaryPromotionRecords] = await Promise.all([
      dbGetAcademicYears(schoolId),
      dbGetStudentCensusSnapshots(academicYearId),
      dbGetFiscalPeriods(schoolId),
      fiscalPeriodId ? dbGetSalaryPromotionRecords(fiscalPeriodId) : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          academicYears,
          censusSnapshots,
          fiscalPeriods,
          salaryPromotionRecords,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/admin/academic GET Error]', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลปีการศึกษาและรอบนักเรียน',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await verifyAdminSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)',
        },
        { status: adminSession.status }
      );
    }

    const body = await request.json();
    const { action, payload } = body;
    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';

    switch (action) {
      case 'SET_ACTIVE_YEAR': {
        const { yearId, schoolId = '30030099' } = payload;
        await dbSetActiveAcademicYear(yearId, schoolId);
        recordAuditLog(
          'UPDATE_ACADEMIC_YEAR',
          actorName,
          actorRole,
          schoolId,
          `เปลี่ยนปีการศึกษาที่ใช้งานเป็น ID: ${yearId}`
        );
        return NextResponse.json({ success: true, message: 'เปลี่ยนปีการศึกษาที่ใช้งานสำเร็จ' });
      }

      case 'CREATE_YEAR': {
        const { yearTh, schoolId = '30030099' } = payload;
        const newId = await dbCreateAcademicYearWithDefaults(Number(yearTh), schoolId);
        recordAuditLog(
          'CREATE_ACADEMIC_YEAR',
          actorName,
          actorRole,
          schoolId,
          `สร้างปีการศึกษาใหม่ พ.ศ. ${yearTh} พร้อมสร้างรอบนับนักเรียน 10 มิ.ย. และ 10 พ.ย. เริ่มต้น`
        );
        return NextResponse.json({ success: true, data: { id: newId }, message: `สร้างปีการศึกษา ${yearTh} สำเร็จ` });
      }

      case 'UPDATE_SNAPSHOT': {
        const { snapshot } = payload as { snapshot: Partial<StudentCensusSnapshotRecord> & { id: string } };
        const saved = await dbSaveCensusSnapshot(snapshot);
        recordAuditLog(
          'UPDATE_CENSUS_SNAPSHOT',
          actorName,
          actorRole,
          snapshot.id,
          `บันทึกข้อมูลสถิตินักเรียนรอบ snapshot ID: ${snapshot.id}`
        );
        return NextResponse.json({ success: true, data: saved, message: 'บันทึกข้อมูลสถิตินักเรียนสำเร็จ' });
      }

      case 'SET_PRIMARY_ROUND': {
        const { academicYearId, snapshotId } = payload;
        await dbSetPrimaryCensusRound(academicYearId, snapshotId);
        recordAuditLog(
          'SET_PRIMARY_CENSUS_ROUND',
          actorName,
          actorRole,
          snapshotId,
          `ตั้งรอบสถิตินักเรียน ID: ${snapshotId} เป็นรอบหลักสำหรับคำนวณอัตรากำลัง`
        );
        return NextResponse.json({ success: true, message: 'ตั้งรอบหลักสำหรับคิดอัตรากำลังสำเร็จ' });
      }

      case 'TOGGLE_LOCK': {
        const { snapshotId, isLocked } = payload;
        const saved = await dbSaveCensusSnapshot({ id: snapshotId, isLocked });
        recordAuditLog(
          isLocked ? 'LOCK_CENSUS_SNAPSHOT' : 'UNLOCK_CENSUS_SNAPSHOT',
          actorName,
          actorRole,
          snapshotId,
          `${isLocked ? 'ล็อก' : 'ปลดล็อก'} การแก้ไขข้อมูลสถิตินักเรียนรอบ ID: ${snapshotId}`
        );
        return NextResponse.json({
          success: true,
          data: saved,
          message: `${isLocked ? 'ล็อก' : 'ปลดล็อก'}ข้อมูลรอบเรียบร้อยแล้ว`,
        });
      }

      case 'SET_ACTIVE_FISCAL_PERIOD': {
        const { fiscalPeriodId, schoolId = '30030099' } = payload;
        await dbSetActiveFiscalPeriod(fiscalPeriodId, schoolId);
        recordAuditLog(
          'UPDATE_FISCAL_PERIOD',
          actorName,
          actorRole,
          schoolId,
          `เปลี่ยนรอบปีงบประมาณที่เปิดใช้งานเป็น ID: ${fiscalPeriodId}`
        );
        return NextResponse.json({ success: true, message: 'เปลี่ยนรอบปีงบประมาณที่ใช้งานสำเร็จ' });
      }

      case 'CREATE_FISCAL_PERIOD': {
        const { schoolId = '30030099', fiscalYearTh, roundNo, refCensusSnapshotId } = payload;
        const newPeriod = await dbCreateFiscalPeriod({
          schoolId,
          fiscalYearTh: Number(fiscalYearTh),
          roundNo: Number(roundNo) as 1 | 2,
          refCensusSnapshotId: refCensusSnapshotId || null,
        });
        recordAuditLog(
          'CREATE_FISCAL_PERIOD',
          actorName,
          actorRole,
          schoolId,
          `สร้างรอบปีงบประมาณใหม่: ปี ${fiscalYearTh} รอบที่ ${roundNo}`
        );
        return NextResponse.json({
          success: true,
          data: newPeriod,
          message: `สร้างรอบปีงบประมาณ ${fiscalYearTh} รอบที่ ${roundNo} สำเร็จ`,
        });
      }

      case 'UPDATE_FISCAL_PERIOD': {
        const { periodId, updates } = payload;
        const updated = await dbUpdateFiscalPeriod(periodId, updates);
        recordAuditLog(
          'UPDATE_FISCAL_PERIOD',
          actorName,
          actorRole,
          periodId,
          `อัปเดตสถานะรอบปีงบประมาณ ID: ${periodId}`
        );
        return NextResponse.json({
          success: true,
          data: updated,
          message: 'อัปเดตรอบปีงบประมาณสำเร็จ',
        });
      }

      case 'SNAPSHOT_STAFF_SALARY': {
        const { fiscalPeriodId } = payload;
        const teachers = await dbGetTeachers();
        const records = await dbSnapshotStaffForFiscalPeriod(fiscalPeriodId, teachers);
        recordAuditLog(
          'SNAPSHOT_STAFF_SALARY',
          actorName,
          actorRole,
          fiscalPeriodId,
          `บันทึก Snapshot ข้อมูลบุคลากร ${records.length} คน สำหรับรอบปีงบประมาณ ID: ${fiscalPeriodId}`
        );
        return NextResponse.json({
          success: true,
          data: records,
          message: `บันทึก Snapshot บุคลากร ${records.length} คน เรียบร้อยแล้ว`,
        });
      }

      case 'SAVE_SALARY_PROMOTION_RECORD': {
        const { record } = payload as { record: Partial<SalaryPromotionRecord> & { fiscalPeriodId: string; staffId: string } };
        const saved = await dbSaveSalaryPromotionRecord(record);
        recordAuditLog(
          'SAVE_SALARY_PROMOTION_RECORD',
          actorName,
          actorRole,
          record.staffId,
          `บันทึกข้อมูลการเลื่อนเงินเดือนสำหรับครู ID: ${record.staffId}`
        );
        return NextResponse.json({
          success: true,
          data: saved,
          message: 'บันทึกข้อมูลการเลื่อนเงินเดือนสำเร็จ',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `ไม่รองรับ Action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('[API /api/admin/academic POST Error]', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'เกิดข้อผิดพลาดในการประมวลผล',
      },
      { status: 500 }
    );
  }
}
