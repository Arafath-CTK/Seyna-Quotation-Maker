'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Edit, Eye, Plus } from 'lucide-react';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  const columns: Column<QuoteRow>[] = [
    {
      key: 'quoteNumber',
      header: 'Quote #',
      sortable: true,
      render: (quote) => (
        <span className="font-mono text-sm">
          {quote.quoteNumber || <span className="text-muted-foreground italic">draft</span>}
        </span>
      ),
    },
    {
      key: 'customer.name',
      header: 'Customer',
      sortable: true,
      render: (quote) => <span className="font-medium">{quote.customer?.name || '—'}</span>,
    },
    {
      key: 'totals.grandTotal',
      header: 'Total',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      render: (quote) => (
        <span className="font-mono">
          {quote.totals ? `${quote.currency} ${quote.totals.grandTotal.toFixed(3)}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'text-center',
      headerClassName: 'text-center',
      render: (quote) => (
        <Badge
          variant={quote.status === 'finalized' ? 'default' : 'secondary'}
          className={
            quote.status === 'finalized'
              ? 'bg-success text-success-foreground'
              : 'bg-warning text-warning-foreground'
          }
        >
          {quote.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (quote) => (
        <span className="text-muted-foreground">
          {new Date(quote.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (quote) => (
        <div className="flex items-center justify-center gap-2">
          {quote.status === 'draft' ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/composer?id=${quote._id}`} title="Edit draft">
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/quotes/${quote._id}/preview`} title="Preview quote">
                  <Eye className="mr-1 h-3 w-3" />
                  Preview
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/api/quotes/${quote._id}/pdf`} title="Download PDF">
                  <Download className="mr-1 h-3 w-3" />
                  PDF
                </Link>
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quotation History</CardTitle>
              <CardDescription>View and manage all your quotes and drafts</CardDescription>
            </div>
            <Button asChild>
              <Link href="/composer">
                <Plus className="mr-2 h-4 w-4" />
                Create Quote
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rows}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search quotes..."
            emptyMessage="No quotes found. Create your first quote to get started."
          />
        </CardContent>
      </Card>
    </div>
  );
}
