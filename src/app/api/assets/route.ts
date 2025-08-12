import { NextRequest, NextResponse } from 'next/server';

// Comprehensive proxy for Figma assets and API calls (bypasses browser CORS)
// Security: restrict to known Figma hosts and paths only

  const ALLOWED_HOSTNAMES = new Set<string>([
  'figma-alpha-api.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com', // older paths like /figma-alpha-api/...
  'images.figma.com',
  'static.figma.com',
  'api.figma.com', // For Figma API calls
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

    // Handle Figma API calls differently from asset downloads
    const isFigmaApi = targetUrl.hostname === 'api.figma.com';
    
    if (isFigmaApi) {
      // For Figma API calls, forward token if provided, but allow unauthenticated calls
      const figmaTokenHeader = req.headers.get('X-Figma-Token');
      const figmaCookie = req.cookies.get('figma_access_token')?.value;
      const isOauthHeader = !!(figmaTokenHeader && /^(figu_|ya29\.)/i.test(figmaTokenHeader));
      const bearer = isOauthHeader ? figmaTokenHeader : (figmaCookie || undefined);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (bearer) {
        headers['Authorization'] = `Bearer ${bearer}`;
      }
      // Only forward X-Figma-Token when it looks like a PAT (figd_...), never for OAuth
      if (figmaTokenHeader && /^figd_/i.test(figmaTokenHeader)) {
        headers['X-Figma-Token'] = figmaTokenHeader;
      }

      const response = await fetch(targetUrl.toString(), {
        headers,
        cache: 'no-store',
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Figma API error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Figma-Token',
        },
      });
    } else {
      // For asset downloads (S3, etc.)
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
          'Access-Control-Allow-Origin': '*',
          // avoid caching signed URLs
          'Cache-Control': 'no-store',
        },
      });
    }
  } catch (e) {
    console.error('Assets proxy error:', e);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Figma-Token',
    },
  });
}


