import Dexie, { type EntityTable } from 'dexie';

interface Delivery {
  id: number;
  amount: number;
  date: Date;
  rawText: string;
  imagePreview?: string;
  createdAt: Date;
  // New fields
  clientName?: string;
  address?: string;
  status: 'pending' | 'delivered' | 'canceled';
}

const db = new Dexie('ComandasonDB') as Dexie & {
  deliveries: EntityTable<Delivery, 'id'>;
};

// Schema definition
db.version(2).stores({
  deliveries: '++id, amount, date, status, createdAt' // Added status to index
});

export type { Delivery };
export { db };
