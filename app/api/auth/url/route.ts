import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GITHUB_CLIENT_ID is not configured in AI Studio Secrets.' }, { status: 500 });
  }

  const appUrl = process.env.APP_URL;
  const redirectUri = appUrl ? `${appUrl}/api/auth/callback` : undefined;

  // We need repo scope to read/write repositories
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo',
  });
  
  if (redirectUri) {
    params.append('redirect_uri', redirectUri);
  }

  const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
  return NextResponse.json({ url });
}
