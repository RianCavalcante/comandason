import Dexie, { type EntityTable } from 'dexie';

interface Delivery {
  id: number;
  amount: number;
  date: Date;
  rawText: string;
  imagePreview?: string;
  createdAt: Date;
  clientName?: string;
  address?: string;
  status: 'processing' | 'pending' | 'delivered' | 'canceled';
}

const db = new Dexie('ComandasonDB') as Dexie & {
  deliveries: EntityTable<Delivery, 'id'>;
};

db.version(3).stores({
  deliveries: '++id, amount, date, status, createdAt'
});

export type { Delivery };
export { db };
