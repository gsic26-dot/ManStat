import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppLogoIcon } from '@/components/brand/AppLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1016] flex flex-col items-center justify-center p-4 text-center selection:bg-sky-500 selection:text-white transition-colors duration-200">
      <div className="mb-4 drop-shadow-lg">
        <AppLogoIcon size={56} />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">ไม่พบหน้าที่ต้องการ (404)</h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
        หน้าที่คุณกำลังเรียกใช้งานไม่มีอยู่ หรือถูกย้ายตำแหน่งแล้ว
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-sm transition-colors duration-200"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        <span>กลับสู่หน้าหลัก</span>
      </Link>
    </div>
  );
}
