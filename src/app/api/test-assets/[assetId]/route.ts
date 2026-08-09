import path from 'node:path';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { fetchPrivateAsset } from '@/lib/content/private-asset-storage';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function inferMimeType(storageKey: string, storedMimeType: string) {
  if (storedMimeType !== 'application/octet-stream') return storedMimeType;

  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  return mimeTypes[path.extname(storageKey).toLowerCase()] ?? storedMimeType;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  if (!UUID_PATTERN.test(assetId)) {
    return NextResponse.json({ error: 'Invalid asset identifier.' }, { status: 400 });
  }

  const asset = await prisma.contentAsset.findUnique({
    where: { id: assetId },
    select: { storageKey: true, mimeType: true },
  });
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }

  try {
    const upstream = await fetchPrivateAsset(asset.storageKey, request.headers.get('range'));
    const commonHeaders = {
      'Accept-Ranges': upstream.headers.get('accept-ranges') ?? 'bytes',
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Type': inferMimeType(asset.storageKey, asset.mimeType),
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    };
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        ...commonHeaders,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        ...(contentRange ? { 'Content-Range': contentRange } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Asset is unavailable.' }, { status: 404 });
  }
}
