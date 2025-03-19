# FTP Scripts for AOS Server

This directory contains scripts for connecting to and interacting with the AOS FTP server at 182.53.226.237.

## Prerequisites

- Node.js installed
- basic-ftp package (`npm install basic-ftp`)

## Available Scripts

### 1. Simple FTP Connection Test

`ftp-connect.mjs` - Basic script to test connection to the FTP server.

**Usage:**
```
node src/scripts/ftp-connect.mjs
```

This script will:
- Connect to the FTP server
- List the contents of the root directory
- Close the connection

### 2. FTP Operations Tool

`ftp-operations.mjs` - A more comprehensive script that allows for listing, uploading, and downloading files.

**Usage:**

List files in a directory:
```
node src/scripts/ftp-operations.mjs list [remotePath]
```
Example: `node src/scripts/ftp-operations.mjs list /data`

Upload a file:
```
node src/scripts/ftp-operations.mjs upload <localFilePath> <remoteFilePath>
```
Example: `node src/scripts/ftp-operations.mjs upload ./myfile.txt /uploads/myfile.txt`

Download a file:
```
node src/scripts/ftp-operations.mjs download <remoteFilePath> <localFilePath>
```
Example: `node src/scripts/ftp-operations.mjs download /data/report.csv ./downloaded-report.csv`

## FTP Server Details

- **Host:** 182.53.226.237
- **Port:** 21
- **User:** AOS
- **Password:** AOS
- **Protocol:** FTP (not FTPS)

## Common Issues

- If you experience connection issues, check that the FTP server is accessible from your network
- Make sure the provided credentials are correct
- For secure connections, you may need to set `secure: true` in the configuration

## Security Note

Be cautious with sensitive data as the connection is using standard FTP which is not encrypted. 