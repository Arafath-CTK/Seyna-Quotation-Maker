import { type NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const collection = await getCollection('customers');
    const customers = await collection.find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const collection = await getCollection('customers');

    const customer = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await collection.insertOne(customer);

    return NextResponse.json({ _id: result.insertedId, ...customer });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
