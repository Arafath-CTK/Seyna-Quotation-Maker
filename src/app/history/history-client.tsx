'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Download, Edit, Eye, Clock } from 'lucide-react';

type QuoteRow = {
  _id: string;
  quoteNumber?: string;
  status: 'draft' | 'finalized';
  customer: { name: string };
  currency: string;
  totals?: { grandTotal: number };
  createdAt: string;
};

export default function HistoryClient() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/quotes');
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        setRows(data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="border-accent mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading quote history...</p>
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="py-12 text-center">
        <Clock className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">No quotes yet</h3>
        <p className="text-muted-foreground mb-6">Create your first quote to see it here.</p>
        <Link
          href="/composer"
          className="bg-accent hover:bg-accent/90 text-accent-foreground inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors"
        >
          <FileText className="h-4 w-4" /> Create Quote
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center gap-3">
        <Clock className="text-accent h-5 w-5" />
        <h2 className="text-xl font-semibold">Recent Quotes</h2>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-sm font-medium">
          {rows.length} total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-border border-b">
            <tr>
              <th className="text-foreground px-6 py-4 text-left text-sm font-medium">Quote #</th>
              <th className="text-foreground px-6 py-4 text-left text-sm font-medium">Customer</th>
              <th className="text-foreground px-6 py-4 text-right text-sm font-medium">Total</th>
              <th className="text-foreground px-6 py-4 text-center text-sm font-medium">Status</th>
              <th className="text-foreground px-6 py-4 text-left text-sm font-medium">Created</th>
              <th className="text-foreground px-6 py-4 text-center text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((q) => (
              <tr key={q._id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-mono text-sm">
                  {q.quoteNumber || <span className="text-muted-foreground italic">draft</span>}
                </td>
                <td className="px-6 py-4 font-medium">{q.customer?.name || '—'}</td>
                <td className="px-6 py-4 text-right font-mono">
                  {q.totals ? `${q.currency} ${q.totals.grandTotal.toFixed(3)}` : '—'}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      q.status === 'finalized'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}
                  >
                    {q.status}
                  </span>
                </td>
                <td className="text-muted-foreground px-6 py-4">
                  {new Date(q.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {q.status === 'draft' ? (
                      <Link
                        href={`/composer?id=${q._id}`}
                        className="text-accent hover:text-accent/80 inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium transition-colors"
                        title="Edit draft"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/quotes/${q._id}/preview`}
                          className="text-accent hover:text-accent/80 inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium transition-colors"
                          title="Preview quote"
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Link>
                        <Link
                          href={`/api/quotes/${q._id}/pdf`}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </Link>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
