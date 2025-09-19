import ProductsClient from './products-client';

export const runtime = 'nodejs';

export default function ProductsPage() {
  return (
    <div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
      <div className="border-border/50 bg-card/50 border-b backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="bg-accent/10 text-accent flex h-12 w-12 items-center justify-center rounded-xl">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-foreground text-3xl font-bold tracking-tight">Products</h1>
              <p className="text-muted-foreground text-balance">
                Manage your product catalog. Products added here will be available as suggestions in
                the Quote Composer.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <ProductsClient />
      </main>
    </div>
  );
}
