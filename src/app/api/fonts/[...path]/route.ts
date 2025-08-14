import { NextRequest, NextResponse } from 'next/server';

// Single font proxy that handles both CSS and font files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    
    console.log('Font proxy called:', { path, searchParams });
    
    // Determine if this is a CSS request or font file request
    const isCssRequest = path === 'css2' || path.startsWith('css/');
    const isFontFile = path.includes('.woff2') || path.includes('.ttf') || path.includes('.woff');
    
    let targetUrl: string;
    
    if (isCssRequest) {
      // CSS request - fetch from Google Fonts
      targetUrl = `https://fonts.googleapis.com/css2${searchParams ? `?${searchParams}` : ''}`;
    } else if (isFontFile) {
      // Font file request - fetch from Google Fonts static
      targetUrl = `https://fonts.gstatic.com/${path}`;
    } else {
      // Fallback - try Google Fonts
      targetUrl = `https://fonts.googleapis.com/${path}${searchParams ? `?${searchParams}` : ''}`;
    }
    
    console.log('Fetching from:', targetUrl);
    
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LazyCode.ai/1.0)',
        },
      });
      
      if (!response.ok) {
        console.error('Font proxy error:', { status: response.status, statusText: response.statusText, url: targetUrl });
        return NextResponse.json(
          { error: `Font loading failed: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }
    
          if (isCssRequest) {
        // For CSS, we need to replace gstatic URLs with our proxy
        let css = await response.text();
        const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
        css = css.replace(
          /https:\/\/fonts\.gstatic\.com\//g,
          `${baseUrl}/api/fonts/`
        );
        
        return new NextResponse(css, {
          headers: {
            'Content-Type': 'text/css',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      } else {
        // For font files, return binary data
        const buffer = await response.arrayBuffer();
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'font/woff2',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=31536000', // 1 year cache
          },
        });
      }
    } catch (fetchError) {
      console.error('Font proxy fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Font loading failed due to network error' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Font proxy error:', error);
    return NextResponse.json(
      { error: 'Font loading failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
