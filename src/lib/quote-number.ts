import { getCollection } from './mongodb';

export async function nextQuoteNumber(opts: {
  prefix: string;
  yearReset: boolean;
}): Promise<string> {
  const counters = await getCollection('counters');
  const year = new Date().getFullYear();

  // Use a distinct key per year when yearReset is true
  const key = opts.yearReset ? `quote:${year}` : 'quote';

  // No conflict: do NOT touch `seq` in $setOnInsert; $inc creates it as 1 if missing
  const res = await counters.findOneAndUpdate(
    { _id: key },
    {
      $inc: { seq: 1 },
      $setOnInsert: { year }, // metadata only; fine to set on insert
    },
    { upsert: true, returnDocument: 'after' as const },
  );

  const seq = res?.value?.seq ?? 1;
  const padded = String(seq).padStart(3, '0');

  // Still include year in the human-facing number for readability
  return `${opts.prefix}-${year}-${padded}`;
}
