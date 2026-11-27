/**
 * ============================================================================
 * ManStat: Offline Thai Geography Cascading Lookup Helper
 * ============================================================================
 * Powered by offline `thai-address-database` (77 provinces, 928 districts,
 * 7,400+ subdistricts & postal codes) with zero external runtime API calls.
 * ============================================================================
 */

import { searchAddressByProvince, type ThaiAddressEntry } from 'thai-address-database';

export const THAI_PROVINCES_77: readonly string[] = [
  'กระบี่', 'กรุงเทพมหานคร', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร',
  'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง',
  'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม',
  'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส',
  'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์',
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา',
  'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์',
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน',
  'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง',
  'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย',
  'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี',
  'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย',
  'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์',
  'อุทัยธานี', 'อุบลราชธานี',
];

const provinceCache = new Map<string, ThaiAddressEntry[]>();

function getEntriesForProvince(province: string): ThaiAddressEntry[] {
  const key = province.trim();
  if (!key) return [];
  const cached = provinceCache.get(key);
  if (cached) return cached;
  const rows = (searchAddressByProvince(key, 1000) || []).filter(
    (item) => item.province === key
  );
  provinceCache.set(key, rows);
  return rows;
}

export function getThaiProvinces(): readonly string[] {
  return THAI_PROVINCES_77;
}

export function getDistrictsByProvince(province?: string | null): string[] {
  if (!province) return [];
  const set = new Set<string>();
  for (const item of getEntriesForProvince(province)) {
    if (item.amphoe) set.add(item.amphoe);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
}

export function getSubdistrictsByDistrict(
  province?: string | null,
  district?: string | null
): string[] {
  if (!province || !district) return [];
  const targetDist = district.trim();
  if (!targetDist) return [];
  const set = new Set<string>();
  for (const item of getEntriesForProvince(province)) {
    if (item.amphoe === targetDist && item.district) {
      set.add(item.district);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
}

export function getPostalCode(
  province?: string | null,
  district?: string | null,
  subdistrict?: string | null
): string {
  if (!province || !district || !subdistrict) return '';
  const targetDist = district.trim();
  const targetSub = subdistrict.trim();
  const found = getEntriesForProvince(province).find(
    (item) => item.amphoe === targetDist && item.district === targetSub
  );
  return found && found.zipcode ? String(found.zipcode) : '';
}
