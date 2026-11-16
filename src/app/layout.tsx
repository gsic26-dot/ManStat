import type { Metadata } from 'next';
import './globals.css';
import { InactivityGuard } from '@/components/security/InactivityGuard';

export const metadata: Metadata = {
  title: 'ManStat-Modern | ระบบบริหารงานบุคคลโรงเรียนชุมชนบ้านตะขบ',
  description: 'ระบบบริหารงานบุคคลและคำนวณระเบียบราชการไทย สพฐ. มาตรฐานความปลอดภัย PDPA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0e141b] text-slate-100 min-h-screen antialiased selection:bg-sky-500 selection:text-white">
        {/* Session Inactivity Guard (44 min alert, 45 min auto-logout) */}
        <InactivityGuard warningMinutes={44} timeoutMinutes={45} />
        {children}
      </body>
    </html>
  );
}
