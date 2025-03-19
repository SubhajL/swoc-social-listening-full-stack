import { Client } from 'basic-ftp';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Main function to connect to FTP server
 */
async function connectToFTP() {
  const client = new Client();
  client.ftp.verbose = true; // Enable detailed logging
  
  try {
    console.log('Connecting to FTP server...');
    
    // Connection settings
    await client.access({
      host: '182.53.226.237',
      port: 21,
      user: 'AOS',
      password: 'AOS',
      secure: false // Set to true if using FTPS
    });
    
    console.log('Connected successfully!');
    
    // List the contents of the current directory
    console.log('Directory listing:');
    const listing = await client.list();
    listing.forEach(item => {
      console.log(`${item.isDirectory ? '[DIR]' : '[FILE]'} ${item.name}`);
    });
    
    // You can add more operations here:
    // - Upload files: await client.uploadFrom(localFilePath, remoteFilePath)
    // - Download files: await client.downloadTo(localFilePath, remoteFilePath)
    // - Change directory: await client.cd(path)
    // - Create directory: await client.ensureDir(path)
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.close(); // Always close the connection
    console.log('FTP connection closed');
  }
}

// Run the function
connectToFTP().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 