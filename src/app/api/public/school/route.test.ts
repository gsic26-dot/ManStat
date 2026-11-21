import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from './route';

describe('Public School Information API (/api/public/school)', () => {
  it('returns valid school name without leaking sensitive PII or administrative data', async () => {
    const response = await GET();
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.success, true);
    assert.ok(typeof json.school_name === 'string' && json.school_name.length > 0);
    assert.ok(typeof json.schoolName === 'string' && json.schoolName.length > 0);

    // Strict PDPA check: must ONLY expose school_name, no sensitive fields
    assert.equal((json as any).directorName, undefined);
    assert.equal((json as any).contactPhone, undefined);
    assert.equal((json as any).email, undefined);
    assert.equal((json as any).lat, undefined);
    assert.equal((json as any).lng, undefined);
    assert.equal((json as any).staffList, undefined);
    assert.equal((json as any).teachers, undefined);
  });
});
