import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Browser SQL IDE',
  description: 'A comprehensive web-based SQL IDE for database management',
  icons: {
    icon: [
      { url: '/icon.png', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script id="ignore-cancellation-unhandledrejection" strategy="beforeInteractive">
          {`
            (() => {
              window.addEventListener('unhandledrejection', (event) => {
                const reason = event.reason;
                const reasonType =
                  reason && typeof reason.type === 'string' ? reason.type.toLowerCase() : '';
                const reasonMsg =
                  reason && typeof reason.msg === 'string' ? reason.msg.toLowerCase() : '';

                let serialized = '';
                try {
                  serialized = JSON.stringify(reason).toLowerCase();
                } catch {}

                const isAbortError =
                  reason &&
                  typeof reason === 'object' &&
                  typeof reason.name === 'string' &&
                  reason.name === 'AbortError';
                const isManualCancellation =
                  reasonType === 'cancelation' ||
                  reasonType === 'cancellation' ||
                  reasonMsg.includes('operation is manually canceled') ||
                  serialized.includes('"type":"cancelation"') ||
                  serialized.includes('"type":"cancellation"') ||
                  serialized.includes('operation is manually canceled');

                if (isAbortError || isManualCancellation) {
                  event.preventDefault();
                }
              }, { capture: true });
            })();
          `}
        </Script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
