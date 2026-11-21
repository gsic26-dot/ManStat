import type { Metadata } from 'next';
import './globals.css';
import { InactivityGuard } from '@/components/security/InactivityGuard';
import { ThemeProvider } from '@/context/ThemeContext';
import { UserSettingsProvider } from '@/context/UserSettingsContext';

export const metadata: Metadata = {
  title: 'ManStat | ระบบบริหารงานบุคคลโรงเรียนชุมชนบ้านตะขบ',
  description: 'ระบบบริหารงานบุคคลและคำนวณระเบียบราชการไทย สพฐ. มาตรฐานความปลอดภัย PDPA',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Synchronous flicker-free theme resolver script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('manstat-theme-mode') || 'auto';
                  var isDark = false;
                  if (mode === 'dark') {
                    isDark = true;
                  } else if (mode === 'light') {
                    isDark = false;
                  } else {
                    var hour = new Date().getHours();
                    isDark = !(hour >= 6 && hour < 18);
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#f8fafc] text-slate-900 dark:bg-[#0b1016] dark:text-slate-100 min-h-screen antialiased selection:bg-sky-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <UserSettingsProvider>
            {/* Session Inactivity Guard (44 min alert, 45 min auto-logout) */}
            <InactivityGuard warningMinutes={44} timeoutMinutes={45} />
            {children}
          </UserSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
