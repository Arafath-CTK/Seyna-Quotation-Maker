import ComposerClient from './composer-client';

export default function ComposerPage({ searchParams }: { searchParams: { id?: string } }) {
  const id = typeof searchParams?.id === 'string' ? searchParams.id : undefined;

  return (
    <div className="from-background via-muted/30 to-background min-h-screen bg-gradient-to-br">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-3">
            <div className="from-accent to-accent/80 rounded-xl bg-gradient-to-br p-3 shadow-lg">
              <svg
                className="text-accent-foreground h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="from-foreground to-muted-foreground bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent">
                Quote Composer
              </h1>
              <p className="text-muted-foreground mt-1 text-balance">
                Create professional quotes with customer details, line items, and automated
                calculations
              </p>
            </div>
          </div>
        </div>

        <ComposerClient initialId={id} />
      </div>
    </div>
  );
}
