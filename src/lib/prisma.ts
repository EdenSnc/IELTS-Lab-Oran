import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '');
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  const isPrismaPostgres = dbUrl.startsWith('prisma+postgres://') || dbUrl.startsWith('prisma://');

  if (isPrismaPostgres) {
    return new PrismaClient({
      accelerateUrl: dbUrl,
    });
  } else {
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
