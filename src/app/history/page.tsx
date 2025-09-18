import HistoryClient from './history-client';

export default function HistoryPage() {
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-foreground text-3xl font-bold tracking-tight">Quote History</h1>
              <p className="text-muted-foreground text-balance">
                Browse all drafts and finalized quotes
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="border-border bg-card rounded-2xl border shadow-sm">
          <div className="p-6">
            <HistoryClient />
          </div>
        </div>
      </main>
    </div>
  );
}
