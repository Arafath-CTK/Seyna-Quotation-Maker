import { Download, ExternalLink } from 'lucide-react';

export default function QuotePreviewPage({ params }: { params: { id: string } }) {
  const id = params.id;

  return (
    <div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
      <div className="border-border/50 bg-card/50 border-b backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-accent/10 text-accent flex h-12 w-12 items-center justify-center rounded-xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-foreground text-3xl font-bold tracking-tight">Quote Preview</h1>
                <p className="text-muted-foreground text-balance">
                  Review and download your finalized quote
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`/api/quotes/${id}/pdf`}
                className="border-border hover:bg-muted/50 inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Open in new tab
              </a>
              <a
                href={`/api/quotes/${id}/pdf`}
                download
                className="bg-accent hover:bg-accent/90 text-accent-foreground inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div className="aspect-[1/1.414] w-full bg-white">
            <iframe
              src={`/api/quotes/${id}/pdf`}
              className="h-full w-full border-0"
              title="Quote PDF Preview"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
