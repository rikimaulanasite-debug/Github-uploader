import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const hasCookieConfig = cookieStore.has('github_client_id') && cookieStore.has('github_client_secret');
  const hasEnvConfig = !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;
  
  return NextResponse.json({ configured: hasCookieConfig || hasEnvConfig });
}

export async function POST(request: Request) {
  try {
    const { clientId, clientSecret } = await request.json();
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const cookieStore = await cookies();
    // Store credentials securely in HTTP-only cookies
    cookieStore.set('github_client_id', clientId, { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'none', 
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    
    cookieStore.set('github_client_secret', clientSecret, { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'none', 
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Config error:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
