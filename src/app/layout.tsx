import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'QuoteForge',
  description: 'Generate professional quotations fast',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold">
              QuoteForge
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/products" className="hover:underline">
                Products
              </Link>
              <Link href="/settings" className="hover:underline">
                Settings
              </Link>
              <Link href="/composer" className="hover:underline">
                Quote Composer
              </Link>
              <Link href="/history" className="hover:underline">
                History
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
