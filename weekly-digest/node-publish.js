// === Node: "Publish to GitHub" (n8n Code node) ===
// Commits the post page and updates the /blog/news/ index. Netlify auto-deploys on push.
const TOKEN = 'PASTE_FINE_GRAINED_PAT_HERE'; // <-- paste your GitHub token in n8n
const OWNER = 'admin-coastaldirectory';
const REPO  = 'comicstore';
const BRANCH = 'main';
const API = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/';
const H = { Authorization: 'Bearer ' + TOKEN, 'User-Agent': 'csnm-digest-bot', Accept: 'application/vnd.github+json' };
const d = $input.first().json;

async function getFile(path) {
  try {
    const r = await this.helpers.httpRequest({ method: 'GET', url: API + path + '?ref=' + BRANCH, headers: H, json: true });
    return r; // { content, sha, ... }
  } catch (e) { return null; } // 404 = new file
}
async function putFile(path, contentStr, message, sha) {
  const body = { message, content: Buffer.from(contentStr, 'utf8').toString('base64'), branch: BRANCH };
  if (sha) body.sha = sha;
  return await this.helpers.httpRequest({ method: 'PUT', url: API + path, headers: H, body, json: true });
}

const out = {};

// 1) the post page (create or update)
const existingPost = await getFile(d.postPath);
const p1 = await putFile(d.postPath, d.postHtml, 'Weekly digest: ' + d.slug, existingPost && existingPost.sha);
out.post = p1 && p1.commit ? 'ok' : 'fail';

// 2) the index: insert the new card after the marker (skip if this slug already linked)
const idx = await getFile(d.indexPath);
if (idx && idx.content) {
  let html = Buffer.from(idx.content, 'base64').toString('utf8');
  if (html.indexOf('/blog/news/' + d.slug + '/') === -1) {
    html = html.replace('<!--NEWS-POSTS-->', '<!--NEWS-POSTS-->' + d.indexCard);
    const p2 = await putFile(d.indexPath, html, 'Index: add ' + d.slug, idx.sha);
    out.index = p2 && p2.commit ? 'ok' : 'fail';
  } else { out.index = 'already-listed'; }
} else {
  // index doesn't exist on the branch yet -> create it (self-contained shell, this post listed)
  const shell = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Comic Book News Roundups | ComicStoresNearMe</title>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="https://comicstoresnearme.com/blog/news/">'
    + '<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fafaf7;color:#222;line-height:1.5;margin:0}.wrap{max-width:760px;margin:0 auto;padding:40px 20px}h1{font-family:Georgia,serif;color:#111;font-size:32px;margin:0 0 8px}a{color:#c03030;text-decoration:none}.post-card{display:block;background:#fff;border:1px solid #ebebeb;border-radius:12px;padding:22px 24px;margin:14px 0}.pc-tag{font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;color:#c03030}.pc-title{font-family:Georgia,serif;font-size:20px;color:#111;margin:6px 0}.pc-desc{font-size:14px;color:#666;line-height:1.6}.pc-date{font-size:12px;color:#999;margin-top:10px}</style></head><body><div class="wrap"><p><a href="/blog">&larr; Blog</a></p><h1>Comic book news roundups</h1><p>The biggest comic stories, record sales, and the best collector videos, rounded up every week.</p><div class="post-list"><!--NEWS-POSTS-->'
    + d.indexCard + '</div></div></body></html>';
  const p2c = await putFile(d.indexPath, shell, 'Index: create + add ' + d.slug);
  out.index = (p2c && p2c.commit) ? 'created' : 'fail';
}

out.postUrl = d.postUrl;
// pass everything through for the email + social nodes
return [{ json: Object.assign({}, d, out) }];
