import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('github_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { owner, repo, branch = 'main', files, message } = body;

    if (!owner || !repo || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // 1. Get the reference to the branch
    let refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers });
    let refData;
    
    if (!refRes.ok) {
       // Fallback to master if branch not found
       refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/master`, { headers });
       if (!refRes.ok) {
           return NextResponse.json({ error: `Branch ${branch} or master not found` }, { status: 404 });
       }
    }
    refData = await refRes.json();
    
    const commitSha = refData.object.sha;

    // 2. Get the commit to get the tree SHA
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`, { headers });
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file and build the tree array
    const tree = [];
    for (const file of files) {
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: file.content,
          encoding: 'base64',
        }),
      });
      const blobData = await blobRes.json();
      tree.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    // 4. Create a new tree
    const newTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree,
      }),
    });
    const newTreeData = await newTreeRes.json();

    // 5. Create a new commit
    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: message || 'Upload files via GitHub Uploader',
        tree: newTreeData.sha,
        parents: [commitSha],
      }),
    });
    const newCommitData = await newCommitRes.json();

    // 6. Update the reference
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${refData.ref.replace('refs/heads/', '')}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: newCommitData.sha,
      }),
    });

    if (!updateRefRes.ok) {
      throw new Error('Failed to update reference');
    }

    return NextResponse.json({ success: true, commitUrl: newCommitData.html_url });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
