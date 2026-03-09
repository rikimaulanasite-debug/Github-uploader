import { useState, useEffect } from 'react';
import { Github, Key, Save, Loader2, Settings } from 'lucide-react';
import { motion } from 'motion/react';

export function ConnectGitHub({ 
  onConnect, 
  isConfigured, 
  onConfigSaved 
}: { 
  onConnect: () => void;
  isConfigured: boolean;
  onConfigSaved: () => void;
}) {
  const [showSetup, setShowSetup] = useState(!isConfigured);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShowSetup(!isConfigured);
  }, [isConfigured]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      
      if (res.ok) {
        onConfigSaved();
        setShowSetup(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (showSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Key className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 mb-2">
              Setup GitHub OAuth
            </h1>
            <p className="text-zinc-400 text-sm mb-8">
              Please enter your GitHub OAuth App credentials to enable login. These will be securely stored in your browser session.
            </p>

            <form onSubmit={handleSave} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">
                  Client ID
                </label>
                <input 
                  type="text" 
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. Iv1.8a..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">
                  Client Secret
                </label>
                <input 
                  type="password" 
                  required
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="e.g. 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-3.5 rounded-xl font-medium transition-all mt-6"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Credentials
                  </>
                )}
              </button>
              
              {isConfigured && (
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-2 transition-colors"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="space-y-4">
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto shadow-2xl border border-zinc-800/50">
            <Github className="w-10 h-10 text-zinc-100" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-100">
            GitHub Uploader
          </h1>
          <p className="text-zinc-400 text-lg">
            Seamlessly upload files and folders directly to your GitHub repositories.
          </p>
        </div>

        <button
          onClick={onConnect}
          className="w-full flex items-center justify-center gap-3 bg-zinc-100 hover:bg-white text-zinc-900 px-6 py-4 rounded-xl font-medium transition-all active:scale-[0.98]"
        >
          <Github className="w-5 h-5" />
          Connect with GitHub
        </button>

        <div className="flex justify-center">
          <button 
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Reconfigure OAuth App
          </button>
        </div>
      </motion.div>
    </div>
  );
}
