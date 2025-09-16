import { MongoClient, Db, Collection, Document } from 'mongodb';

declare global {
  // Your augmentation is fine for Node/Next
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error('Missing MONGODB_URI in env');

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || 'quoteforge';
  return client.db(dbName);
}

export async function getCollection<TSchema extends Document = Document>(
  name: string,
): Promise<Collection<TSchema>> {
  const db = await getDb();
  return db.collection<TSchema>(name);
}
