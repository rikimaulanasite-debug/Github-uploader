import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return new NextResponse('Missing code', { status: 400 });
  }

  const cookieStore = await cookies();
  const clientId = process.env.GITHUB_CLIENT_ID || cookieStore.get('github_client_id')?.value;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || cookieStore.get('github_client_secret')?.value;

  if (!clientId || !clientSecret) {
    return new NextResponse('OAuth Error: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing. Please configure them first.', { status: 500 });
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await tokenResponse.json();

    if (data.error) {
      console.error('GitHub OAuth error:', data);
      return new NextResponse(`OAuth Error: ${data.error_description}`, { status: 400 });
    }

    const token = data.access_token;

    const cookieStore = await cookies();
    cookieStore.set('github_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    const html = `
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
