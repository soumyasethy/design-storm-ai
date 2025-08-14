import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.FIGMA_CLIENT_ID || '';
  const redirectEnv = process.env.FIGMA_REDIRECT_URI || '';

  // Derive redirect from request origin if env missing
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const redirectUri = redirectEnv || `${origin}/api/auth/figma/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Missing FIGMA_CLIENT_ID' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'files:read',
    state: Math.random().toString(36).slice(2),
    response_type: 'code'
  });

  const authUrl = `https://www.figma.com/oauth?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
