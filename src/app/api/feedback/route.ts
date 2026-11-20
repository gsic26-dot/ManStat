import { NextResponse } from 'next/server';
import { dbGetFeedbacks, dbCreateFeedback, dbUpdateFeedback, recordAuditLog } from '@/lib/db/serverDb';
import { getSessionUser } from '@/lib/auth/serverAuth';
import type { FeedbackItem } from '@/lib/data/schoolData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const feedbacks = await dbGetFeedbacks();
    return NextResponse.json(
      { success: true, data: feedbacks },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/feedback GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลข้อเสนอแนะ' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, title, description, senderName } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกหัวข้อและรายละเอียดข้อเสนอแนะ' },
        { status: 400 }
      );
    }

    const newFeedback: FeedbackItem = {
      id: `FB-${Date.now()}`,
      category: category || 'feature',
      title,
      description,
      senderName: senderName || 'บุคลากรทั่วไป',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    const saved = await dbCreateFeedback(newFeedback);

    const sessionUser = await getSessionUser();
    const actorName = sessionUser ? `${sessionUser.name}` : senderName || 'ผู้ใช้ระบบ';
    const actorRole = sessionUser?.role || 'teacher';

    recordAuditLog(
      'SUBMIT_FEEDBACK',
      actorName,
      actorRole,
      title,
      `ส่งข้อคิดเห็น/แจ้งปัญหา: ${title} (${category})`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'ส่งข้อเสนอแนะเรียบร้อยแล้ว ขอบคุณที่ร่วมพัฒนาปรับปรุงระบบ',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/feedback POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการส่งข้อเสนอแนะ' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const feedback: FeedbackItem = body;

    if (!feedback || !feedback.id) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลข้อเสนอแนะไม่ถูกต้อง (ต้องระบุ id)' },
        { status: 400 }
      );
    }

    const saved = await dbUpdateFeedback(feedback);

    return NextResponse.json(
      {
        success: true,
        message: 'อัปเดตสถานะข้อเสนอแนะเรียบร้อยแล้ว',
        data: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/feedback PATCH Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อเสนอแนะ' },
      { status: 500 }
    );
  }
}
