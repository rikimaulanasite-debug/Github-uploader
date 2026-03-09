import { useState, useEffect, useRef } from 'react';
import { LogOut, FolderGit2, Upload, File as FileIcon, X, CheckCircle, Loader2, Search, Plus, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';

export function Dashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [files, setFiles] = useState<{name: string, size: number, content: string}[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<{ url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Create Repo State
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRepos(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/png;base64, part
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processFiles = async (fileList: File[]) => {
    const newProcessedFiles: {name: string, size: number, content: string}[] = [];
    
    for (const file of fileList) {
      if (file.name.endsWith('.zip')) {
        try {
          const zip = new JSZip();
          const contents = await zip.loadAsync(file);
          
          for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
            if (!zipEntry.dir) {
              const base64Content = await zipEntry.async('base64');
              // We don't have exact size without decompressing, so we estimate or use 0
              newProcessedFiles.push({
                name: relativePath,
                size: base64Content.length * 0.75, // rough estimate of bytes from base64
                content: base64Content
              });
            }
          }
        } catch (err) {
          console.error('Failed to extract ZIP:', err);
          setError(`Failed to extract ${file.name}`);
        }
      } else {
        const base64Content = await convertToBase64(file);
        newProcessedFiles.push({
          name: file.name,
          size: file.size,
          content: base64Content
        });
      }
    }
    
    setFiles((prev) => [...prev, ...newProcessedFiles]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      await processFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      await processFiles(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedRepo || files.length === 0) return;
    
    setUploading(true);
    setError(null);
    setUploadSuccess(null);

    try {
      const fileData = files.map((file) => ({
        path: file.name,
        content: file.content,
      }));

      const res = await fetch('/api/github/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          branch: selectedRepo.default_branch,
          files: fileData,
          message: commitMessage || `Add ${files.length} files via Uploader`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess({ url: data.commitUrl });
      setFiles([]);
      setCommitMessage('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingRepo(true);
    setRepoError(null);

    try {
      const res = await fetch('/api/github/repos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRepoName,
          description: newRepoDesc,
          private: newRepoPrivate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create repository');
      }

      // Add to list and select it
      setRepos([data.repo, ...repos]);
      setSelectedRepo(data.repo);
      setShowCreateRepo(false);
      setNewRepoName('');
      setNewRepoDesc('');
      setNewRepoPrivate(false);
    } catch (err: any) {
      setRepoError(err.message);
    } finally {
      setCreatingRepo(false);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Header / Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={user.avatar_url} alt={user.login} className="w-12 h-12 rounded-full border border-zinc-700" />
            <div>
              <h2 className="font-medium text-zinc-100">{user.name || user.login}</h2>
              <p className="text-sm text-zinc-400">@{user.login}</p>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl flex flex-col h-[600px]">
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-zinc-100 flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-indigo-400" />
                Repositories
              </h3>
              <button 
                onClick={() => setShowCreateRepo(true)}
                className="p-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-md transition-colors"
                title="Create new repository"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search repos..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loadingRepos ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : (
              filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                    selectedRepo?.id === repo.id 
                      ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <div className="font-medium truncate">{repo.name}</div>
                  <div className="text-xs opacity-60 truncate mt-0.5">{repo.full_name}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-8">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 min-h-[600px] flex flex-col">
          {!selectedRepo ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <FolderGit2 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Select a repository to start uploading</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                  {selectedRepo.name}
                  <span className="text-xs font-normal px-2 py-1 bg-zinc-800 text-zinc-400 rounded-md">
                    {selectedRepo.default_branch}
                  </span>
                </h2>
                <p className="text-zinc-400 mt-1">{selectedRepo.description || 'No description'}</p>
              </div>

              <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-zinc-700 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                </div>
                <p className="text-lg font-medium text-zinc-200 mb-1">Click or drag files here</p>
                <p className="text-zinc-500 text-sm flex items-center gap-1">
                  <Archive className="w-4 h-4" /> ZIP files will be automatically extracted
                </p>
              </div>

              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8 flex-1 flex flex-col"
                  >
                    <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Selected Files ({files.length})</h3>
                    <div className="space-y-2 mb-6 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-zinc-950 border border-zinc-800/80 p-3 rounded-xl">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileIcon className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                            <span className="text-sm text-zinc-300 truncate">{file.name}</span>
                            <span className="text-xs text-zinc-600 flex-shrink-0">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto space-y-4">
                      <div>
                        <label className="text-sm font-medium text-zinc-400 mb-2 block">Commit Message</label>
                        <input 
                          type="text" 
                          placeholder={`Add ${files.length} files via Uploader`}
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                          {error}
                        </div>
                      )}

                      {uploadSuccess && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            <span>Files uploaded successfully!</span>
                          </div>
                          <a href={uploadSuccess.url} target="_blank" rel="noreferrer" className="underline hover:text-emerald-300">
                            View Commit
                          </a>
                        </div>
                      )}

                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Commit & Push
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      {/* Create Repo Modal */}
      <AnimatePresence>
        {showCreateRepo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-zinc-100">Create Repository</h3>
                <button 
                  onClick={() => setShowCreateRepo(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRepo} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Repository Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="e.g. my-awesome-project"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-zinc-100"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Description (Optional)</label>
                  <input 
                    type="text" 
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    placeholder="What is this repository for?"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-zinc-100"
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input 
                    type="checkbox" 
                    id="private-repo"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-zinc-900 bg-zinc-950"
                  />
                  <label htmlFor="private-repo" className="text-sm text-zinc-300 cursor-pointer">
                    Make repository private
                  </label>
                </div>

                {repoError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                    {repoError}
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateRepo(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingRepo || !newRepoName}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {creatingRepo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
