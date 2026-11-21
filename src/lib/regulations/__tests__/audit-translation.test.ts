import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  translateAuditAction,
  cleanAuditTargetName,
  cleanAuditActor,
  filterAndSortAuditLogs,
} from '../audit-translation';
import type { AuditLogRecord } from '@/lib/db/serverDb';

describe('Audit Log Translation & Sorting', () => {
  it('correctly translates action codes and classifies categories with dot colors', () => {
    // Delete action
    const del = translateAuditAction('DELETE_STAFF');
    assert.equal(del.title, 'ลบบุคลากร');
    assert.equal(del.category, 'delete');
    assert.equal(del.dotClass, 'bg-rose-400');

    // Sensitive PDPA action
    const sens = translateAuditAction('VIEW_CITIZEN_ID');
    assert.equal(sens.title, 'เปิดดูเลขประจำตัวประชาชน');
    assert.equal(sens.category, 'sensitive');
    assert.equal(sens.dotClass, 'bg-amber-400');

    // Update / System action
    const upd = translateAuditAction('UPDATE_OFFERED_GRADES');
    assert.equal(upd.title, 'ปรับระดับชั้นที่เปิดสอน');
    assert.equal(upd.category, 'update');
    assert.equal(upd.dotClass, 'bg-sky-400');
  });

  it('correctly cleans target names', () => {
    assert.equal(cleanAuditTargetName('ตั้งค่าระบบ (System Preferences)'), 'ตั้งค่าระบบ');
    assert.equal(cleanAuditTargetName('บันทึกข้อมูล (Append-only)'), 'บันทึกข้อมูล');
    assert.equal(cleanAuditTargetName('นายสมชาย มโนธรรม'), 'นายสมชาย มโนธรรม');
  });

  it('correctly cleans actor names and roles', () => {
    const actor1 = cleanAuditActor('Superuser (นายธีรศักดิ์ มโนธรรม)', 'superuser');
    assert.equal(actor1.name, 'นายธีรศักดิ์ มโนธรรม');
    assert.equal(actor1.roleLabel, 'ผู้ดูแลระบบสูงสุด');

    const actor2 = cleanAuditActor('นางสุภาณี กิจจานุกูล (Admin)', 'hr_admin');
    assert.equal(actor2.name, 'นางสุภาณี กิจจานุกูล');
    assert.equal(actor2.roleLabel, 'เจ้าหน้าที่งานบุคคล');
  });

  it('strictly sorts logs in descending order (Newest First) so index 0 is newest (ลำดับ 1)', () => {
    const sampleLogs: AuditLogRecord[] = [
      {
        id: 'log-1',
        action: 'SYSTEM_INIT',
        actorName: 'Admin',
        actorRole: 'admin',
        targetName: 'ระบบ',
        ipAddress: '127.0.0.1',
        timestamp: '2026-11-19T08:00:00Z',
        details: 'เริ่มต้น',
      },
      {
        id: 'log-3',
        action: 'DELETE_STAFF',
        actorName: 'Admin',
        actorRole: 'admin',
        targetName: 'ครู ก',
        ipAddress: '127.0.0.1',
        timestamp: '2026-11-21T12:00:00Z', // newest
        details: 'ลบ',
      },
      {
        id: 'log-2',
        action: 'UPDATE_STAFF',
        actorName: 'Admin',
        actorRole: 'admin',
        targetName: 'ครู ข',
        ipAddress: '127.0.0.1',
        timestamp: '2026-11-20T10:00:00Z',
        details: 'แก้ไข',
      },
    ];

    const sorted = filterAndSortAuditLogs(sampleLogs);
    assert.equal(sorted[0].id, 'log-3'); // 2026-11-21 (Newest)
    assert.equal(sorted[1].id, 'log-2'); // 2026-11-20
    assert.equal(sorted[2].id, 'log-1'); // 2026-11-19
  });

  it('filters logs by category and search text', () => {
    const sampleLogs: AuditLogRecord[] = [
      {
        id: 'log-1',
        action: 'VIEW_CITIZEN_ID',
        actorName: 'Admin',
        actorRole: 'admin',
        targetName: 'ครู ก',
        ipAddress: '127.0.0.1',
        timestamp: '2026-11-21T12:00:00Z',
        details: 'เปิดดูเลขบัตร',
      },
      {
        id: 'log-2',
        action: 'DELETE_STAFF',
        actorName: 'Admin',
        actorRole: 'admin',
        targetName: 'ครู ข',
        ipAddress: '127.0.0.1',
        timestamp: '2026-11-20T10:00:00Z',
        details: 'ลบบุคลากร',
      },
    ];

    const sensitiveOnly = filterAndSortAuditLogs(sampleLogs, '', 'sensitive');
    assert.equal(sensitiveOnly.length, 1);
    assert.equal(sensitiveOnly[0].id, 'log-1');

    const searchMatch = filterAndSortAuditLogs(sampleLogs, 'ครู ข');
    assert.equal(searchMatch.length, 1);
    assert.equal(searchMatch[0].id, 'log-2');
  });
});
