import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('figma_access_token')?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const res = await fetch('https://api.figma.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    const user = await res.json();
    return NextResponse.json({ authenticated: true, user, access_token: token });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}


