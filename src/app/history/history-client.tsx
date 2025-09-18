'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
        const res = await fetch('/api/quotes'); // we’ll build this API next
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
    return <div className="text-sm text-gray-500">Loading quotes…</div>;
  }

  if (!rows.length) {
    return <div className="text-sm text-gray-500">No quotes found yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Quote #</th>
            <th className="px-4 py-2 text-left font-medium">Customer</th>
            <th className="px-4 py-2 text-left font-medium">Total</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Created</th>
            <th className="px-4 py-2 text-left font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((q) => (
            <tr key={q._id} className="hover:bg-gray-50">
              <td className="px-4 py-2">
                {q.quoteNumber || <span className="text-gray-400 italic">draft</span>}
              </td>
              <td className="px-4 py-2">{q.customer?.name || '—'}</td>
              <td className="px-4 py-2">
                {q.totals ? `${q.currency} ${q.totals.grandTotal.toFixed(3)}` : '—'}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    q.status === 'finalized'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {q.status}
                </span>
              </td>
              <td className="px-4 py-2">{new Date(q.createdAt).toLocaleDateString()}</td>
              <td className="space-x-2 px-4 py-2">
                {q.status === 'draft' ? (
                  <Link href={`/composer?id=${q._id}`} className="text-blue-600 hover:underline">
                    Edit
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/quotes/${q._id}/preview`}
                      className="text-blue-600 hover:underline"
                    >
                      Preview
                    </Link>
                    <Link
                      href={`/api/quotes/${q._id}/pdf`}
                      className="text-blue-600 hover:underline"
                    >
                      Download PDF
                    </Link>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
