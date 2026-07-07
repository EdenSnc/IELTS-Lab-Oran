import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env parser to override system environment variables
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const firstEquals = trimmed.indexOf('=');
          const key = trimmed.substring(0, firstEquals).trim();
          let val = trimmed.substring(firstEquals + 1).trim();
          // Remove wrapping quotes
          val = val.replace(/^["']|["']$/g, '');
          process.env[key] = val;
        }
      }
      console.log('Loaded configurations from .env file successfully.');
    }
  } catch (err) {
    console.error('Failed to parse .env file:', err);
  }
}

async function testConnection() {
  console.log('--- Database Connection Debugger ---');
  
  // Load .env explicitly to override system variables
  loadEnvFile();

  const dbUrl = process.env.DATABASE_URL;
  console.log('DATABASE_URL starts with:', dbUrl ? dbUrl.substring(0, 50) + '...' : 'N/A');
  
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  const isPrismaPostgres = dbUrl.startsWith('prisma+postgres://') || dbUrl.startsWith('prisma://');
  console.log('Connection protocol:', isPrismaPostgres ? 'Prisma Postgres (Serverless)' : 'Standard PostgreSQL (Driver Adapter)');

  let prisma: PrismaClient;

  if (isPrismaPostgres) {
    console.log('Initializing PrismaClient with accelerateUrl...');
    prisma = new PrismaClient({
      accelerateUrl: dbUrl,
    });
  } else {
    console.log('Initializing PrismaClient with pg Driver Adapter...');
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  try {
    console.log('Connecting to database...');
    const start = Date.now();
    await prisma.$connect();
    console.log(`Successfully connected in ${Date.now() - start}ms!`);

    console.log('Running test query (counting Prospects)...');
    const prospectCount = await prisma.prospect.count();
    console.log(`Query succeeded! Number of prospects in DB: ${prospectCount}`);

    console.log('Running test query (counting LeadMagnetDownloads)...');
    const downloadCount = await prisma.leadMagnetDownload.count();
    console.log(`Query succeeded! Number of downloads in DB: ${downloadCount}`);

    console.log('\nDatabase connection is fully functional! ✅');
  } catch (error: any) {
    console.error('\n❌ Connection Failed!');
    console.error('Error Details:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected PrismaClient.');
  }
}

testConnection();
