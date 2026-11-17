import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { destinationSchema, campaignSlugSchema, isFirstPartyDestination, destinationForPlacement } from '../src/lib/acquisition/validation.ts';
import { publicAcquisitionLink } from '../src/lib/acquisition/public-link.ts';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocalPath, override: false });
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL missing. Populate .env.local before running manage-acquisition.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--') && i + 1 < args.length) {
      flags[a.slice(2)] = args[++i];
    }
  }
  return flags;
}

const [command, ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);

try {
  if (command === 'list') {
    const campaigns = await prisma.acquisitionCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        placements: {
          orderBy: { createdAt: 'asc' },
          include: {
            dailyCounts: true,
            inspections: { orderBy: { checkedAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    for (const c of campaigns) {
      console.log(`\nCampaign: ${c.name} [${c.slug}] (${c.id})`);
      for (const p of c.placements) {
        const scans = p.dailyCounts.reduce((acc, d) => acc + d.requests, 0);
        const leads = isFirstPartyDestination(p.destination)
          ? await prisma.leadMagnetDownload.count({ where: { utmSource: 'ieltslab', utmContent: p.code } })
          : null;
        const resolved = destinationForPlacement(p.destination, c.slug, p.medium, p.code);
        console.log(`  - ${p.label} | code=${p.code} | active=${p.active} | medium=${p.medium}`);
        console.log(`    QR URL: ${publicAcquisitionLink(p.code)}`);
        console.log(`    Target: ${p.destination} -> ${resolved}`);
        console.log(`    Scans: ${scans} | Leads: ${leads ?? 'N/A (external)'}`);
      }
    }
  } else if (command === 'ensure-campaign') {
    const name = flags.name;
    const slug = campaignSlugSchema.parse(flags.slug);
    if (!name) throw new Error('--name and --slug required');
    const c = await prisma.acquisitionCampaign.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    console.log(JSON.stringify(c, null, 2));
  } else if (command === 'ensure-placement') {
    const slug = campaignSlugSchema.parse(flags.campaign);
    const label = flags.label?.trim();
    const medium = flags.medium || 'poster';
    const destination = destinationSchema.parse(flags.destination || '/fr#intake');
    if (!label) throw new Error('--campaign and --label required');
    const campaign = await prisma.acquisitionCampaign.findUniqueOrThrow({ where: { slug } });
    const existing = await prisma.acquisitionPlacement.findFirst({
      where: { campaignId: campaign.id, label },
    });
    const placement = existing ?? await prisma.acquisitionPlacement.create({
      data: {
        campaignId: campaign.id,
        label,
        medium,
        destination,
        code: randomBytes(9).toString('base64url'),
      },
    });
    console.log(JSON.stringify({
      ...placement,
      qrUrl: publicAcquisitionLink(placement.code),
      resolvedTarget: destinationForPlacement(placement.destination, campaign.slug, placement.medium, placement.code),
    }, null, 2));
  } else if (command === 'retarget') {
    const code = flags.code;
    const destination = destinationSchema.parse(flags.destination);
    if (!code) throw new Error('--code and --destination required');
    const updated = await prisma.acquisitionPlacement.update({
      where: { code },
      data: { destination },
    });
    console.log('Retargeted:', updated.code, '->', updated.destination);
  } else if (command === 'render-all') {
    const slug = campaignSlugSchema.parse(flags.campaign);
    const templatePath = flags.template;
    const outDir = flags.outdir;
    if (!templatePath || !outDir) throw new Error('--campaign, --template, and --outdir required');
    fs.mkdirSync(outDir, { recursive: true });
    const template = sharp(templatePath);
    const meta = await template.metadata();
    if (meta.width !== 1748 || meta.height !== 2480 || meta.format !== 'png') {
      throw new Error(`Expected 1748x2480 PNG template, got ${meta.width}x${meta.height} ${meta.format}`);
    }
    const campaign = await prisma.acquisitionCampaign.findUniqueOrThrow({
      where: { slug },
      include: { placements: { where: { active: true }, orderBy: { createdAt: 'asc' } } },
    });
    const manifest = [];
    for (const p of campaign.placements) {
      const safeLabel = p.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const url = publicAcquisitionLink(p.code);
      const posterFile = path.join(outDir, `poster-${safeLabel}-${p.code}.png`);
      const qrFile = path.join(outDir, `qr-${safeLabel}-${p.code}.png`);
      const qrBuf = await QRCode.toBuffer(url, { width: 360, margin: 4, errorCorrectionLevel: 'M' });
      fs.writeFileSync(qrFile, qrBuf);
      const posterBuf = await sharp(templatePath)
        .composite([{ input: qrBuf, left: 220, top: 2006 }])
        .withMetadata({ density: 300 })
        .png()
        .toBuffer();
      fs.writeFileSync(posterFile, posterBuf);
      manifest.push({
        label: p.label,
        code: p.code,
        qrUrl: url,
        destination: p.destination,
        resolvedTarget: destinationForPlacement(p.destination, campaign.slug, p.medium, p.code),
        posterFile,
        qrFile,
      });
      console.log(`Rendered ${posterFile} (${url})`);
    }
    fs.writeFileSync(path.join(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
  } else {
    console.log('Commands: list | ensure-campaign | ensure-placement | retarget | render-all');
  }
} finally {
  await prisma.$disconnect();
}
