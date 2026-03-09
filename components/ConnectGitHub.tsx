import { Github } from 'lucide-react';
import { motion } from 'motion/react';

export function ConnectGitHub({ onConnect }: { onConnect: () => void }) {
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

        <div className="text-sm text-zinc-600 space-y-2">
          <p>Requires OAuth configuration.</p>
          <p>Check the setup instructions in the chat.</p>
        </div>
      </motion.div>
    </div>
  );
}
