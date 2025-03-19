import { Client } from 'basic-ftp';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Set up environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// FTP server configuration
const FTP_CONFIG = {
  host: '182.53.226.237',
  port: 21,
  user: 'AOS',
  password: 'AOS',
  secure: false // Set to true if using FTPS
};

/**
 * Create an FTP client and connect to the server
 * @returns {Promise<Client>} Connected FTP client
 */
async function connectFTP() {
  const client = new Client();
  client.ftp.verbose = true; // Enable detailed logging
  
  console.log(`Connecting to FTP server ${FTP_CONFIG.host}:${FTP_CONFIG.port}...`);
  await client.access(FTP_CONFIG);
  console.log('Connected successfully!');
  
  return client;
}

/**
 * List files in a directory on the FTP server
 * @param {string} remotePath - Path on the FTP server to list
 */
async function listFiles(remotePath = '.') {
  const client = await connectFTP();
  
  try {
    console.log(`Listing files in directory: ${remotePath}`);
    await client.cd(remotePath);
    
    const listing = await client.list();
    
    if (listing.length === 0) {
      console.log('Directory is empty');
    } else {
      console.log('Directory contents:');
      listing.forEach(item => {
        const itemType = item.isDirectory ? '[DIR]' : '[FILE]';
        const itemSize = item.isDirectory ? '' : `(${formatBytes(item.size)})`;
        console.log(`${itemType} ${item.name} ${itemSize}`);
      });
    }
  } catch (err) {
    console.error('Error listing files:', err);
  } finally {
    client.close();
    console.log('FTP connection closed');
  }
}

/**
 * Upload a file to the FTP server
 * @param {string} localFilePath - Path to the local file
 * @param {string} remoteFilePath - Destination path on the FTP server
 */
async function uploadFile(localFilePath, remoteFilePath) {
  if (!fs.existsSync(localFilePath)) {
    console.error(`Local file does not exist: ${localFilePath}`);
    return;
  }
  
  const client = await connectFTP();
  
  try {
    console.log(`Uploading ${localFilePath} to ${remoteFilePath}...`);
    await client.uploadFrom(localFilePath, remoteFilePath);
    console.log('Upload completed successfully!');
  } catch (err) {
    console.error('Error uploading file:', err);
  } finally {
    client.close();
    console.log('FTP connection closed');
  }
}

/**
 * Download a file from the FTP server
 * @param {string} remoteFilePath - Path to the file on the FTP server
 * @param {string} localFilePath - Destination path on the local machine
 */
async function downloadFile(remoteFilePath, localFilePath) {
  const client = await connectFTP();
  
  try {
    console.log(`Downloading ${remoteFilePath} to ${localFilePath}...`);
    await client.downloadTo(localFilePath, remoteFilePath);
    console.log('Download completed successfully!');
  } catch (err) {
    console.error('Error downloading file:', err);
  } finally {
    client.close();
    console.log('FTP connection closed');
  }
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Process command line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    // Default action: list files in the root directory
    await listFiles();
    return;
  }
  
  switch (command) {
    case 'list':
      const remotePath = args[1] || '.';
      await listFiles(remotePath);
      break;
    
    case 'upload':
      if (args.length < 3) {
        console.error('Usage: upload <localFilePath> <remoteFilePath>');
        process.exit(1);
      }
      await uploadFile(args[1], args[2]);
      break;
    
    case 'download':
      if (args.length < 3) {
        console.error('Usage: download <remoteFilePath> <localFilePath>');
        process.exit(1);
      }
      await downloadFile(args[1], args[2]);
      break;
    
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Available commands: list, upload, download');
      process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 