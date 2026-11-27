declare module 'thai-address-database' {
  export interface ThaiAddressEntry {
    district: string; // ตำบล / แขวง
    amphoe: string;   // อำเภอ / เขต
    province: string; // จังหวัด
    zipcode: string | number;
  }

  export function searchAddressByDistrict(searchStr: string, maxResult?: number): ThaiAddressEntry[];
  export function searchAddressByAmphoe(searchStr: string, maxResult?: number): ThaiAddressEntry[];
  export function searchAddressByProvince(searchStr: string, maxResult?: number): ThaiAddressEntry[];
  export function searchAddressByZipcode(searchStr: string, maxResult?: number): ThaiAddressEntry[];
}
