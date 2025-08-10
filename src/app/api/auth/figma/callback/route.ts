import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 OAuth callback received');
    
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    console.log('📝 Callback params:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!error,
      error 
    });

    if (error) {
      console.error('❌ OAuth error from Figma:', error);
      return NextResponse.redirect(new URL('/upload?error=oauth_error', request.url));
    }

    if (!code || !state) {
      console.error('❌ Missing code or state');
      return NextResponse.redirect(new URL('/upload?error=missing_params', request.url));
    }

    // Call Figma OAuth API directly
    console.log('🔄 Exchanging code for token directly...');
    
    const clientId = process.env.FIGMA_CLIENT_ID || process.env.NEXT_PUBLIC_FIGMA_CLIENT_ID || '';
    const clientSecret = process.env.FIGMA_CLIENT_SECRET || '';
    const redirectUri = process.env.NEXT_PUBLIC_FIGMA_REDIRECT_URI || 'http://localhost:3000/api/auth/figma/callback';

    if (!clientId || !clientSecret) {
      console.error('❌ Missing FIGMA_CLIENT_ID or FIGMA_CLIENT_SECRET');
      return NextResponse.redirect(new URL('/upload?error=missing_params', request.url));
    }

    // First try official API endpoint, then fall back to legacy path if needed
    const formBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code'
    }).toString();

    let tokenResponse = await fetch('https://www.figma.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formBody
    });

    console.log('📡 Token response status:', tokenResponse.status);
    console.log('🔗 Direct Figma API URL: https://www.figma.com/api/oauth/token');
    
    if (!tokenResponse.ok) {
      const firstErrorText = await tokenResponse.text();
      console.error('❌ Token exchange failed on /api/oauth/token:', firstErrorText);
      console.error('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));
      // Fallback to legacy endpoint
      tokenResponse = await fetch('https://www.figma.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formBody,
      });
      console.log('📡 Fallback token response status (/oauth/token):', tokenResponse.status);
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('❌ Token exchange failed on fallback:', errorText);
        return NextResponse.redirect(new URL('/upload?error=token_exchange_failed', request.url));
      }
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token exchange successful');
    
    // Get user info
    const userResponse = await fetch('https://api.figma.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('❌ Failed to get user info');
      return NextResponse.redirect(new URL('/upload?error=user_info_failed', request.url));
    }

    const userData = await userResponse.json();
    console.log('✅ User info retrieved:', userData.email);

    // Store the token in session/cookie for the client
    const response = NextResponse.redirect(new URL('/upload?success=true', request.url));
    response.cookies.set('figma_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600
    });
    
    return response;

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return NextResponse.redirect(new URL('/upload?error=callback_failed', request.url));
  }
} 