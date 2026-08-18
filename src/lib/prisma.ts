import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '');
  
  if (!dbUrl) {
    if (process.env.NODE_ENV === 'test') {
      return new PrismaClient();
    }
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  const pool = new Pool({
    connectionString: dbUrl,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 500 : 30_000,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
