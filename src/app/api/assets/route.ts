import { NextRequest, NextResponse } from 'next/server';

// Very small proxy to download Figma image assets server-side (bypasses browser CORS)
// Security: restrict to known Figma/S3 hosts and image paths only

const ALLOWED_HOSTNAMES = new Set<string>([
  'figma-alpha-api.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com', // older paths like /figma-alpha-api/...
  'images.figma.com',
  'static.figma.com',
]);

function isAllowed(url: URL): boolean {
  if (ALLOWED_HOSTNAMES.has(url.hostname)) return true;
  // allow any *amazonaws.com* host if path contains /figma-alpha-api/ or /images/
  if (url.hostname.endsWith('amazonaws.com')) {
    return /\/(figma-alpha-api|images)\//.test(url.pathname);
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const target = u.searchParams.get('url');
    if (!target) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }

    if (!isAllowed(targetUrl)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
    }

    const res = await fetch(targetUrl.toString(), { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }
    const ct = res.headers.get('content-type') || 'application/octet-stream';
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        // avoid caching signed URLs
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}


