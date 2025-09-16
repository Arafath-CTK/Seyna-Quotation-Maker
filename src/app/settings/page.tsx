import { getCollection } from '@/lib/mongodb';
import SettingsForm from '@/components/SettingsForm';
import { Building2, FileText, Hash, Settings } from 'lucide-react';

export const runtime = 'nodejs';

export default async function SettingsPage() {
  // Load settings directly from DB (server component = zero client flicker)
  const col = await getCollection('settings');
  const doc = await col.findOne({});
  const initial = doc ?? null;

  return (
    <div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
      <div className="border-border/50 bg-card/50 border-b backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="bg-accent/10 text-accent flex h-12 w-12 items-center justify-center rounded-xl">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-foreground text-3xl font-bold tracking-tight">
                Business Settings
              </h1>
              <p className="text-muted-foreground text-balance">
                Configure your company details, letterhead, and quote numbering preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="sticky top-8 space-y-2">
              <h2 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
                Configuration
              </h2>
              <nav className="space-y-1">
                <a
                  href="#company"
                  className="text-foreground hover:bg-accent/10 hover:text-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  Company Details
                </a>
                <a
                  href="#letterhead"
                  className="text-muted-foreground hover:bg-accent/10 hover:text-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Letterhead & Margins
                </a>
                <a
                  href="#numbering"
                  className="text-muted-foreground hover:bg-accent/10 hover:text-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  <Hash className="h-4 w-4" />
                  Quote Numbering
                </a>
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-9">
            <SettingsForm initialSettings={initial} />
          </div>
        </div>
      </main>
    </div>
  );
}
