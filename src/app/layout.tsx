import type React from 'react';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Suspense } from 'react';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Seyna - Quotation Maker',
  description:
    'Generate professional quotations fast with advanced analytics and customer management',
  generator: 'Seyna',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <div
              className="flex min-h-screen lg:block lg:grid lg:[grid-template-columns:var(--sidebar-w,280px)_1fr] lg:grid-rows-[1fr]"
              style={{}}
            >
              <Sidebar />
              <div className="flex min-w-0 flex-col">
                <Header />
                <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">{children}</main>
              </div>
            </div>
          </Suspense>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
