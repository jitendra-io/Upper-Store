const fs = require('fs');
const path = require('path');

/**
 * Creates a GitHub Release on the repository and uploads the binary asset (.apk, .exe, .zip).
 * Returns the public CDN browser_download_url from GitHub.
 */
const uploadToGitHubRelease = async ({ filePath, fileName, version, title, description, customToken, customOwner, customRepo }) => {
  const token = customToken || process.env.GITHUB_TOKEN;
  const repoOwner = customOwner || process.env.GITHUB_REPO_OWNER || 'YourJITENDRA';
  const repoName = customRepo || process.env.GITHUB_REPO_NAME || 'Upper-Official';

  if (!token || token.includes('your_github_token')) {
    console.warn('⚠️ GITHUB_TOKEN is not configured in backend/.env or form request. Skipping GitHub Release upload.');
    return null;
  }

  try {
    const cleanVersion = (version || '1.0.0').replace(/[^a-zA-Z0-9._-]/g, '_');
    const tagName = `v${cleanVersion}-${Date.now().toString().slice(-6)}`;
    const releaseTitle = `${title || 'Release'} (v${version || '1.0.0'})`;
    const releaseNotes = `${description || 'Official release release build.'}\n\nAutomated upload via Upper Admin Control Center.`;

    console.log(`🚀 Creating GitHub Release "${releaseTitle}" (Tag: ${tagName})...`);

    // 1. Create Release Tag via GitHub REST API
    const createReleaseRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Upper-Official-Backend',
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: releaseTitle,
        body: releaseNotes,
        draft: false,
        prerelease: false,
      }),
    });

    const releaseData = await createReleaseRes.json();

    if (!createReleaseRes.ok) {
      throw new Error(releaseData.message || 'Failed to create GitHub release.');
    }

    const uploadUrlRaw = releaseData.upload_url; // e.g. "https://uploads.github.com/repos/.../assets{?name,label}"
    const uploadUrl = uploadUrlRaw.split('{')[0] + `?name=${encodeURIComponent(fileName || path.basename(filePath))}`;

    console.log(`📦 Uploading asset "${fileName}" to GitHub Release...`);

    // 2. Read File Stream/Buffer and Upload Asset
    const fileStats = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    // Determine MIME type based on extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.apk') contentType = 'application/vnd.android.package-archive';
    else if (ext === '.exe' || ext === '.msi') contentType = 'application/x-msdownload';
    else if (ext === '.zip') contentType = 'application/zip';

    const uploadAssetRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': contentType,
        'Content-Length': fileStats.size.toString(),
        'User-Agent': 'Upper-Official-Backend',
      },
      duplex: 'half',
      body: fileStream,
    });

    const assetData = await uploadAssetRes.json();

    if (!uploadAssetRes.ok) {
      throw new Error(assetData.message || 'Failed to upload asset to GitHub release.');
    }

    const downloadUrl = assetData.browser_download_url;
    console.log(`✅ GitHub Release Asset Uploaded Successfully! CDN URL: ${downloadUrl}`);
    return downloadUrl;
  } catch (err) {
    console.error('❌ GitHub Release Upload Error:', err.message);
    return null;
  }
};

module.exports = { uploadToGitHubRelease };
