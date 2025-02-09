import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { createHash } from 'crypto';

const RID_URLS = {
  oauth: 'http://hyd-app.rid.go.th/API/source/oauth.js',
  sha1: 'http://hyd-app.rid.go.th/API/source/sha1.js'
};

const LOCAL_PATHS = {
  oauth: path.join(__dirname, '../public/lib/oauth.js'),
  sha1: path.join(__dirname, '../public/lib/sha1.js')
};

async function fetchFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.text();
}

function getFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function compareFiles() {
  console.log('Comparing OAuth libraries...\n');

  // Compare oauth.js
  try {
    console.log('Comparing oauth.js:');
    const ridOAuth = await fetchFile(RID_URLS.oauth);
    const localOAuth = fs.readFileSync(LOCAL_PATHS.oauth, 'utf8');
    
    const ridOAuthHash = getFileHash(ridOAuth);
    const localOAuthHash = getFileHash(localOAuth);
    
    console.log(`RID oauth.js hash:   ${ridOAuthHash}`);
    console.log(`Local oauth.js hash: ${localOAuthHash}`);
    console.log(`Match: ${ridOAuthHash === localOAuthHash ? 'YES' : 'NO'}\n`);
  } catch (error) {
    console.error('Error comparing oauth.js:', error);
  }

  // Compare sha1.js
  try {
    console.log('Comparing sha1.js:');
    const ridSha1 = await fetchFile(RID_URLS.sha1);
    const localSha1 = fs.readFileSync(LOCAL_PATHS.sha1, 'utf8');
    
    const ridSha1Hash = getFileHash(ridSha1);
    const localSha1Hash = getFileHash(localSha1);
    
    console.log(`RID sha1.js hash:   ${ridSha1Hash}`);
    console.log(`Local sha1.js hash: ${localSha1Hash}`);
    console.log(`Match: ${ridSha1Hash === localSha1Hash ? 'YES' : 'NO'}\n`);
  } catch (error) {
    console.error('Error comparing sha1.js:', error);
  }
}

compareFiles().catch(console.error); 