import { NextResponse } from 'next/server';

export async function GET() {
  const hash = process.env.AUTH_PASSWORD_HASH || '';
  
  return NextResponse.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ SET' : '❌ NOT SET',
    AUTH_USERNAME: process.env.AUTH_USERNAME || '❌ NOT SET',
    AUTH_PASSWORD_HASH_STATUS: hash ? '✅ SET' : '❌ NOT SET',
    AUTH_PASSWORD_HASH_LENGTH: hash.length,
    AUTH_PASSWORD_HASH_FIRST_10: hash.substring(0, 10),
    AUTH_PASSWORD_HASH_STARTS_WITH_$2: hash.startsWith('$2a$') || hash.startsWith('$2b$'),
    NOTION_API_KEY: process.env.NOTION_API_KEY ? '✅ SET' : '❌ NOT SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET',
  });
}

