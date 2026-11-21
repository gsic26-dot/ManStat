import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Brand Identity: Geometric M-Bar Logo (Option 1)', () => {
  const iconSvgPath = path.resolve('src/app/icon.svg');
  const publicIconSvgPath = path.resolve('public/icon.svg');
  const manifestPath = path.resolve('public/manifest.json');

  it('generates crisp SVG at src/app/icon.svg with required M-Bar geometry', () => {
    assert.ok(fs.existsSync(iconSvgPath), 'src/app/icon.svg must exist');
    const content = fs.readFileSync(iconSvgPath, 'utf-8');

    // Verify dark navy background
    assert.ok(content.includes('#0B1320'), 'Must contain dark navy background #0B1320');

    // Verify gradient colors #38BDF8 -> #6366F1
    assert.ok(content.includes('#38BDF8'), 'Must contain cyan #38BDF8');
    assert.ok(content.includes('#6366F1'), 'Must contain indigo #6366F1');

    // Verify M path
    assert.ok(content.includes('M 16.5 50 V 17.5'), 'Must contain geometric M path');

    // Verify statistical data bar
    assert.ok(content.includes('rect x="28.5"'), 'Must contain center statistical bar');
  });

  it('mirrors SVG logo in public/icon.svg for direct URL resolution', () => {
    assert.ok(fs.existsSync(publicIconSvgPath), 'public/icon.svg must exist');
    const content = fs.readFileSync(publicIconSvgPath, 'utf-8');
    assert.ok(content.includes('manstatLogoGrad'), 'public/icon.svg must contain valid gradient');
  });

  it('provides valid PWA manifest referencing /icon.svg', () => {
    assert.ok(fs.existsSync(manifestPath), 'public/manifest.json must exist');
    const json = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.equal(json.name, 'ManStat | ระบบบริหารงานบุคคล');
    assert.equal(json.short_name, 'ManStat');
    assert.equal(json.background_color, '#0B1320');
    assert.equal(json.icons[0].src, '/icon.svg');
  });
});
