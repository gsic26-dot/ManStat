/**
 * ============================================================================
 * ManStat: Thai Civil Service Staff Name Formatting & Parsing Engine
 * ============================================================================
 * Standard:
 *   - Official Thai Government Naming Conventions (ระเบียบงานสารบรรณ พ.ศ. 2526)
 *   - Idempotent: Never duplicates prefixes (No 'นายนาย...', 'นางสาวนางสาว...')
 *   - Proper Spacing:
 *       * Personal prefixes (นาย, นาง, นางสาว, เด็กชาย, เด็กหญิง) attach directly to first name (0 space)
 *       * Academic, military & rank prefixes (ว่าที่ ร.ต., ว่าที่ร้อยตรี, ดร., ผศ., รศ., ศ.) use 1 space
 *   - Auto-inference for known institution personnel when prefix is missing
 *   - PDPA & Zero-Crash safe (handles null, undefined, objects, raw strings)
 * ============================================================================
 */

export const THAI_PREFIXES = [
  'ว่าที่ร้อยตรี หญิง',
  'ว่าที่ ร.ต. หญิง',
  'ว่าที่ร้อยตรี',
  'ว่าที่ ร.ต.',
  'นางสาว',
  'นาย',
  'นาง',
  'เด็กชาย',
  'เด็กหญิง',
  'ดร.',
  'ศ.ดร.',
  'รศ.ดร.',
  'ผศ.ดร.',
  'ศ.',
  'รศ.',
  'ผศ.',
  'อาจารย์',
] as const;

export const SPACED_PREFIXES = new Set<string>([
  'ว่าที่ร้อยตรี หญิง',
  'ว่าที่ ร.ต. หญิง',
  'ว่าที่ร้อยตรี',
  'ว่าที่ ร.ต.',
  'ดร.',
  'ศ.ดร.',
  'รศ.ดร.',
  'ผศ.ดร.',
  'ศ.',
  'รศ.',
  'ผศ.',
  'อาจารย์',
]);

/**
 * Canonical male personnel codes in Ban Takhob Community School.
 * Guaranteed fallback to 'นาย' if database row has missing or blank prefix.
 */
export const KNOWN_MALE_STAFF_CODES = new Set<string>([
  'EXE-001',
  'TCH-003',
  'TCH-004',
  'TCH-009',
  'TCH-013',
  'STF-002',
]);

/**
 * Canonical female personnel codes in Ban Takhob Community School.
 */
export const KNOWN_FEMALE_STAFF_MAP: Record<string, string> = {
  'TCH-005': 'นางสาว',
  'TCH-006': 'นาง',
  'TCH-007': 'นางสาว',
  'TCH-008': 'นางสาว',
  'TCH-010': 'นางสาว',
  'TCH-011': 'นางสาว',
  'TCH-012': 'นางสาว',
  'TCH-014': 'นางสาว',
  'STF-001': 'นางสาว',
};

/**
 * Known male staff names in the institution (for matching raw strings missing 'นาย').
 */
export const KNOWN_MALE_NAMES = new Set<string>([
  'ธีรศักดิ์ มโนธรรม',
  'ธวัชชัย เหลืองโอฬาร',
  'พันธ์ธนัต ภวฤทธิ์นาคินทร์',
  'กิตติพณ พรหมทอง',
  'ชินวัจน์ มาตย์นอก',
  'กำพล กักหมื่นไวย',
]);

export interface ParsedThaiName {
  prefix: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Detects if a name string already starts with a recognized Thai prefix.
 */
export function extractThaiPrefix(nameStr: string): string | null {
  if (!nameStr) return null;
  const clean = nameStr.trim();
  for (const p of THAI_PREFIXES) {
    if (clean.startsWith(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Parses any Thai name string into prefix, firstName, lastName.
 * Intelligently separates 'นาย', 'นาง', 'นางสาว', or spaced prefixes.
 */
export function parseThaiName(rawName: string, defaultPrefix?: string): ParsedThaiName {
  if (!rawName || typeof rawName !== 'string') {
    return { prefix: defaultPrefix || '', firstName: '', lastName: '', fullName: '' };
  }

  const clean = rawName.trim();
  const existingPrefix = extractThaiPrefix(clean);

  if (existingPrefix) {
    let remainder = clean.slice(existingPrefix.length).trim();
    // Handle edge case where name was "นาย ธีรศักดิ์"
    remainder = remainder.replace(/^\s+/, '');
    const parts = remainder.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    const fullName = formatStaffName({ prefix: existingPrefix, firstName, lastName });

    return {
      prefix: existingPrefix,
      firstName,
      lastName,
      fullName,
    };
  }

  // No prefix found in string
  const parts = clean.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  // Check if known male name
  let prefix = defaultPrefix || '';
  if (!prefix && KNOWN_MALE_NAMES.has(clean)) {
    prefix = 'นาย';
  }

  const fullName = prefix
    ? formatStaffName({ prefix, firstName, lastName })
    : clean;

  return {
    prefix,
    firstName,
    lastName,
    fullName,
  };
}

/**
 * Single Source of Truth for formatting Thai staff names across all modules.
 * Idempotent, PDPA-safe, zero-crash, and guarantees correct prefix attachment.
 */
export function formatStaffName(
  staffOrName?:
    | string
    | null
    | {
        id?: string;
        employeeCode?: string;
        name?: string;
        prefix?: string;
        firstName?: string;
        lastName?: string;
        first_name?: string;
        last_name?: string;
        fullName?: string;
        full_name?: string;
        teacherName?: string;
        [key: string]: any;
      }
): string {
  if (!staffOrName) return '';

  // 1. If string is passed directly
  if (typeof staffOrName === 'string') {
    const trimmed = staffOrName.trim();
    if (!trimmed) return '';

    const existingPrefix = extractThaiPrefix(trimmed);
    if (existingPrefix) {
      // Clean duplicate prefixes like "นายนาย..." or "นาย นาย..."
      let remainder = trimmed.slice(existingPrefix.length).trim();
      const doublePrefix = extractThaiPrefix(remainder);
      if (doublePrefix === existingPrefix) {
        remainder = remainder.slice(doublePrefix.length).trim();
      }
      return SPACED_PREFIXES.has(existingPrefix)
        ? `${existingPrefix} ${remainder}`
        : `${existingPrefix}${remainder}`;
    }

    // Check if it's one of the known male staff names missing 'นาย'
    if (KNOWN_MALE_NAMES.has(trimmed)) {
      return `นาย${trimmed}`;
    }

    return trimmed;
  }

  // 2. If object is passed
  const code = (staffOrName.employeeCode || staffOrName.id || '').toUpperCase().trim();
  let prefix = (staffOrName.prefix || '').trim();
  const firstName = (staffOrName.firstName || staffOrName.first_name || '').trim();
  const lastName = (staffOrName.lastName || staffOrName.last_name || '').trim();
  const rawName = (
    staffOrName.name ||
    staffOrName.fullName ||
    staffOrName.full_name ||
    staffOrName.teacherName ||
    ''
  ).trim();

  // If prefix is not explicitly specified, infer from known code or rawName
  if (!prefix) {
    if (KNOWN_MALE_STAFF_CODES.has(code)) {
      prefix = 'นาย';
    } else if (KNOWN_FEMALE_STAFF_MAP[code]) {
      prefix = KNOWN_FEMALE_STAFF_MAP[code];
    } else if (rawName) {
      const extracted = extractThaiPrefix(rawName);
      if (extracted) prefix = extracted;
    }
  }

  // Case A: Both firstName and lastName are present
  if (firstName) {
    // Check if firstName already has prefix embedded
    const embeddedPrefix = extractThaiPrefix(firstName);
    if (embeddedPrefix) {
      const cleanFirst = firstName.slice(embeddedPrefix.length).trim();
      const usedPrefix = prefix || embeddedPrefix;
      const combined = SPACED_PREFIXES.has(usedPrefix)
        ? `${usedPrefix} ${cleanFirst}`
        : `${usedPrefix}${cleanFirst}`;
      return lastName ? `${combined} ${lastName}` : combined;
    }

    const effectivePrefix = prefix || (KNOWN_MALE_STAFF_CODES.has(code) ? 'นาย' : '');
    const combinedFirst = effectivePrefix
      ? SPACED_PREFIXES.has(effectivePrefix)
        ? `${effectivePrefix} ${firstName}`
        : `${effectivePrefix}${firstName}`
      : firstName;

    return lastName ? `${combinedFirst} ${lastName}` : combinedFirst;
  }

  // Case B: Fall back to rawName
  if (rawName) {
    const existingPrefix = extractThaiPrefix(rawName);
    if (existingPrefix) {
      let remainder = rawName.slice(existingPrefix.length).trim();
      return SPACED_PREFIXES.has(existingPrefix)
        ? `${existingPrefix} ${remainder}`
        : `${existingPrefix}${remainder}`;
    }

    // rawName has no prefix: attach inferred prefix if known
    const effectivePrefix = prefix || (KNOWN_MALE_STAFF_CODES.has(code) ? 'นาย' : '');
    if (effectivePrefix) {
      return SPACED_PREFIXES.has(effectivePrefix)
        ? `${effectivePrefix} ${rawName}`
        : `${effectivePrefix}${rawName}`;
    }

    return rawName;
  }

  return '';
}
