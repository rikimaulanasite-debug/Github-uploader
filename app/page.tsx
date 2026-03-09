'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ConnectGitHub } from '@/components/ConnectGitHub';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkConfig();
    checkAuth();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkConfig = async () => {
    try {
      const res = await fetch('/api/auth/config');
      const data = await res.json();
      setIsConfigured(data.configured);
    } catch (e) {
      setIsConfigured(false);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/github/user');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get auth URL');
      }
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      alert(`OAuth Error: ${error.message}\n\nPlease make sure you have configured GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the AI Studio Secrets menu.`);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isAuthenticated === null || isConfigured === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <ConnectGitHub 
          onConnect={handleConnect} 
          isConfigured={isConfigured} 
          onConfigSaved={checkConfig} 
        />
      )}
    </div>
  );
}
