import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    FIGMA_CLIENT_ID: process.env.FIGMA_CLIENT_ID,
    FIGMA_CLIENT_SECRET: process.env.FIGMA_CLIENT_SECRET ? '***' : 'undefined',
    NEXT_PUBLIC_FIGMA_CLIENT_ID: process.env.NEXT_PUBLIC_FIGMA_CLIENT_ID,
    NEXT_PUBLIC_FIGMA_REDIRECT_URI: process.env.NEXT_PUBLIC_FIGMA_REDIRECT_URI,
    NODE_ENV: process.env.NODE_ENV,
    allFigmaVars: Object.keys(process.env).filter(key => key.includes('FIGMA')),
    allEnvKeys: Object.keys(process.env).sort(),
    hasClientId: !!process.env.FIGMA_CLIENT_ID,
    hasClientSecret: !!process.env.FIGMA_CLIENT_SECRET,
    hasRedirectUri: !!process.env.NEXT_PUBLIC_FIGMA_REDIRECT_URI,
    clientIdLength: process.env.FIGMA_CLIENT_ID?.length || 0
  };

  console.log('🔍 Environment variables test:', envVars);
  console.log('🔍 Raw FIGMA_CLIENT_ID:', process.env.FIGMA_CLIENT_ID);
  console.log('🔍 Raw FIGMA_CLIENT_SECRET:', process.env.FIGMA_CLIENT_SECRET ? '***' : 'undefined');
  console.log('🔍 Raw NEXT_PUBLIC_FIGMA_REDIRECT_URI:', process.env.NEXT_PUBLIC_FIGMA_REDIRECT_URI);

  return NextResponse.json({
    message: 'Environment variables check',
    envVars,
    timestamp: new Date().toISOString()
  });
} 