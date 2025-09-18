export default function QuotePreviewPage({ params }: { params: { id: string } }) {
  const id = params.id;
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Quote Preview</h1>
      <div className="flex gap-2">
        <a
          href={`/api/quotes/${id}/pdf`}
          className="rounded bg-black px-3 py-2 text-white hover:bg-gray-800"
          target="_blank"
        >
          Open in new tab
        </a>
        <a
          href={`/api/quotes/${id}/pdf`}
          download
          className="rounded border px-3 py-2 hover:bg-gray-50"
        >
          Download PDF
        </a>
      </div>
      <div className="mt-2 aspect-[1/1.414] w-full overflow-hidden rounded border bg-white">
        <iframe src={`/api/quotes/${id}/pdf`} className="h-full w-full" title="Quote PDF" />
      </div>
    </section>
  );
}
