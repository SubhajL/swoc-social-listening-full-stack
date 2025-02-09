import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RID_URLS = {
  oauth: 'http://hyd-app.rid.go.th/API/source/oauth.js',
  sha1: 'http://hyd-app.rid.go.th/API/source/sha1.js'
};

const LOCAL_PATHS = {
  oauth: path.join(__dirname, '../public/lib/oauth.js'),
  sha1: path.join(__dirname, '../public/lib/sha1.js')
};

async function fetchFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.text();
}

function getFileHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
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

    if (ridOAuthHash !== localOAuthHash) {
      console.log('Content differences in oauth.js:');
      console.log('First 500 characters of RID version:');
      console.log(ridOAuth.substring(0, 500));
      console.log('\nFirst 500 characters of local version:');
      console.log(localOAuth.substring(0, 500));
    }
  } catch (error) {
    console.error('Error comparing oauth.js:', error);
  }

  // Compare sha1.js
  try {
    console.log('\nComparing sha1.js:');
    const ridSha1 = await fetchFile(RID_URLS.sha1);
    const localSha1 = fs.readFileSync(LOCAL_PATHS.sha1, 'utf8');
    
    const ridSha1Hash = getFileHash(ridSha1);
    const localSha1Hash = getFileHash(localSha1);
    
    console.log(`RID sha1.js hash:   ${ridSha1Hash}`);
    console.log(`Local sha1.js hash: ${localSha1Hash}`);
    console.log(`Match: ${ridSha1Hash === localSha1Hash ? 'YES' : 'NO'}\n`);

    if (ridSha1Hash !== localSha1Hash) {
      console.log('Content differences in sha1.js:');
      console.log('First 500 characters of RID version:');
      console.log(ridSha1.substring(0, 500));
      console.log('\nFirst 500 characters of local version:');
      console.log(localSha1.substring(0, 500));
    }
  } catch (error) {
    console.error('Error comparing sha1.js:', error);
  }
}

compareFiles().catch(console.error); 