import '@/styles/globals.css';
import { GeistSans } from 'geist/font/sans';
import { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: '토마토 - 영화 접근성 관리 시스템',
  description: '영화 콘텐츠의 접근성 미디어를 효율적으로 관리하는 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
