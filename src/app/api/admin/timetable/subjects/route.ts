import { NextResponse } from 'next/server';
import {
  dbUpsertSchoolSubject,
  dbToggleSchoolSubjectActive,
  dbDeleteSchoolSubject,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { verifyTimetableManagerSession } from '@/lib/auth/serverAuth';
import type {
  SchoolSubject,
  SchoolSubjectType,
  SubjectLevelGroup,
  SubjectSemesterScope,
} from '@/lib/data/timetableTypes';
import {
  DEFAULT_CURRICULUM_VERSION,
  SCHOOL_SUBJECT_TYPES,
  calculatePrimaryHoursPerYear,
  calculateSecondaryCredits,
} from '@/lib/regulations/school-curriculum-presets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_LEVELS: readonly SubjectLevelGroup[] = ['kindergarten', 'primary', 'secondary'];
const VALID_SEMESTERS: readonly SubjectSemesterScope[] = ['both', '1', '2'];

export async function POST(request: Request) {
  try {
    const adminSession = await verifyTimetableManagerSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบและฝ่ายวิชาการเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const subjectName = String(body?.subjectName || '').trim();
    const subjectGroup = String(body?.subjectGroup || '').trim();
    const levelGroup = String(body?.levelGroup || '') as SubjectLevelGroup;
    const gradeLevels = Array.isArray(body?.gradeLevels)
      ? body.gradeLevels.map((g: unknown) => String(g || '').trim()).filter(Boolean)
      : [];
    const defaultHoursPerWeek = Number(body?.defaultHoursPerWeek);
    const defaultConsecutive = Number(body?.defaultConsecutive ?? 1);

    if (!subjectName || !subjectGroup) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุชื่อรายวิชาและกลุ่มสาระการเรียนรู้' },
        { status: 400 }
      );
    }
    if (!VALID_LEVELS.includes(levelGroup)) {
      return NextResponse.json(
        { success: false, error: 'ระดับชั้นไม่ถูกต้อง (kindergarten | primary | secondary)' },
        { status: 400 }
      );
    }
    if (gradeLevels.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกชั้นที่เปิดสอนอย่างน้อย 1 ระดับชั้น' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(defaultHoursPerWeek) || defaultHoursPerWeek <= 0 || defaultHoursPerWeek > 40) {
      return NextResponse.json(
        { success: false, error: 'จำนวนชั่วโมง/สัปดาห์ต้องมากกว่า 0' },
        { status: 400 }
      );
    }
    if (defaultConsecutive !== 1 && defaultConsecutive !== 2) {
      return NextResponse.json(
        { success: false, error: 'จำนวนชั่วโมงต่อเนื่องต้องเป็น 1 หรือ 2 เท่านั้น' },
        { status: 400 }
      );
    }

    const rawType = String(body?.subjectType || 'พื้นฐาน') as SchoolSubjectType;
    const subjectType: SchoolSubjectType = SCHOOL_SUBJECT_TYPES.includes(rawType)
      ? rawType
      : 'พื้นฐาน';
    const rawSem = String(body?.semesterScope || 'both') as SubjectSemesterScope;
    const semesterScope: SubjectSemesterScope = VALID_SEMESTERS.includes(rawSem) ? rawSem : 'both';

    const hoursPerYear =
      body?.hoursPerYear !== undefined && body?.hoursPerYear !== ''
        ? Math.max(0, Math.round(Number(body.hoursPerYear) || 0))
        : levelGroup === 'secondary'
          ? 0
          : calculatePrimaryHoursPerYear(defaultHoursPerWeek);

    const credits =
      body?.credits !== undefined && body?.credits !== ''
        ? Math.max(0, Math.round((Number(body.credits) || 0) * 10) / 10)
        : levelGroup === 'secondary'
          ? calculateSecondaryCredits(defaultHoursPerWeek)
          : 0;

    const subject: SchoolSubject = {
      id: String(body?.id || '').trim() || `SUB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      subjectCode: String(body?.subjectCode || '').trim(),
      subjectName,
      subjectGroup,
      subjectType,
      levelGroup,
      gradeLevels,
      semesterScope,
      defaultHoursPerWeek,
      hoursPerYear,
      credits,
      preferMorning: Boolean(body?.preferMorning),
      defaultConsecutive: defaultConsecutive === 2 ? 2 : 1,
      curriculumVersion: String(body?.curriculumVersion || DEFAULT_CURRICULUM_VERSION).trim(),
      description: String(body?.description || '').trim(),
      courseDescription: String(body?.courseDescription || '').trim(),
      assessmentRatio: String(body?.assessmentRatio || '').trim(),
      isActive: body?.isActive !== false,
      sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 100,
    };

    const saved = await dbUpsertSchoolSubject(subject);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'UPSERT_SCHOOL_SUBJECT',
      actorName,
      actorRole,
      saved.subjectCode ? `${saved.subjectCode} ${saved.subjectName}` : saved.subjectName,
      `บันทึกรายวิชาในคลังหลักสูตร: ${saved.subjectName} (${saved.gradeLevels.join(', ')})`
    );

    return NextResponse.json(
      { success: true, data: saved },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกรายวิชา';
    console.error('[API /api/admin/timetable/subjects POST Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminSession = await verifyTimetableManagerSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบและฝ่ายวิชาการเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id || typeof body?.isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ id และสถานะ isActive' },
        { status: 400 }
      );
    }

    const updated = await dbToggleSchoolSubjectActive(id, body.isActive);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายวิชาที่ต้องการเปลี่ยนสถานะ' },
        { status: 404 }
      );
    }

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'TOGGLE_SCHOOL_SUBJECT_ACTIVE',
      actorName,
      actorRole,
      updated.subjectCode ? `${updated.subjectCode} ${updated.subjectName}` : updated.subjectName,
      `${updated.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}รายวิชา: ${updated.subjectName}`
    );

    return NextResponse.json(
      { success: true, data: updated },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะรายวิชา';
    console.error('[API /api/admin/timetable/subjects PATCH Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminSession = await verifyTimetableManagerSession();
    if (!adminSession.authorized) {
      return NextResponse.json(
        { success: false, error: adminSession.error || 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบและฝ่ายวิชาการเท่านั้น)' },
        { status: adminSession.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing subject id' }, { status: 400 });
    }

    await dbDeleteSchoolSubject(id);

    const actorName = `${adminSession.user?.name || 'ผู้ดูแลระบบ'} (${adminSession.user?.position || 'Admin'})`;
    const actorRole = adminSession.user?.role || 'hr_admin';
    recordAuditLog(
      'DELETE_SCHOOL_SUBJECT',
      actorName,
      actorRole,
      id,
      `ลบรายวิชาออกจากคลังหลักสูตร รหัส ${id}`
    );

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบรายวิชา';
    console.error('[API /api/admin/timetable/subjects DELETE Error]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
