// src/lib/ids.ts
import { ObjectId } from 'mongodb';

export function toObjectId(id: string) {
  if (!ObjectId.isValid(id)) {
    const err = new Error('Invalid id');
    // @ts-ignore attach status so routes can 400 if you want
    err.status = 400;
    throw err;
  }
  return new ObjectId(id);
}
