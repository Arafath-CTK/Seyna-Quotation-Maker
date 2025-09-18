import HistoryClient from './history-client';

export default function HistoryPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Quote History</h1>
      <p className="text-gray-600">Browse all drafts and finalized quotes</p>
      {/* Client-side component will fetch + render */}
      {/* @ts-expect-error Server/Client boundary */}
      <HistoryClient />
    </section>
  );
}
