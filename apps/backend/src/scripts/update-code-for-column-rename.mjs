import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../..');

// Function to search for files containing the old column names
function findFilesWithOldColumnNames() {
  console.log('Searching for files that might need updates...');
  
  try {
    // Search for files containing 'reservoir_id' or 'formatted_id'
    const grepReservoirId = execSync(
      'grep -r "reservoir_id" --include="*.js" --include="*.ts" --include="*.mjs" --include="*.jsx" --include="*.tsx" apps',
      { cwd: rootDir, encoding: 'utf8' }
    );
    
    const grepFormattedId = execSync(
      'grep -r "formatted_id" --include="*.js" --include="*.ts" --include="*.mjs" --include="*.jsx" --include="*.tsx" apps',
      { cwd: rootDir, encoding: 'utf8' }
    );
    
    // Parse the grep results to get file paths
    const reservoirIdFiles = grepReservoirId
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const colonIndex = line.indexOf(':');
        return colonIndex > 0 ? line.substring(0, colonIndex) : null;
      })
      .filter(Boolean);
    
    const formattedIdFiles = grepFormattedId
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const colonIndex = line.indexOf(':');
        return colonIndex > 0 ? line.substring(0, colonIndex) : null;
      })
      .filter(Boolean);
    
    // Combine and deduplicate the file paths
    const allFiles = [...new Set([...reservoirIdFiles, ...formattedIdFiles])];
    
    console.log(`Found ${allFiles.length} files that might need updates`);
    return allFiles;
    
  } catch (error) {
    console.error('Error searching for files:', error.message);
    return [];
  }
}

// Function to analyze a file and determine if it needs updates
function analyzeFile(filePath) {
  try {
    const fullPath = path.resolve(rootDir, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if the file contains SQL queries or database-related code
    const containsSql = /SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN/i.test(content);
    const containsDbCode = /database|db\.|pool\.|query|knex|sequelize|prisma/i.test(content);
    
    // Check if the file contains the old column names
    const containsReservoirId = content.includes('reservoir_id');
    const containsFormattedId = content.includes('formatted_id');
    
    // Determine if the file needs updates
    const needsUpdate = (containsSql || containsDbCode) && (containsReservoirId || containsFormattedId);
    
    return {
      path: filePath,
      needsUpdate,
      containsReservoirId,
      containsFormattedId,
      containsSql,
      containsDbCode
    };
    
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error.message);
    return {
      path: filePath,
      needsUpdate: false,
      error: error.message
    };
  }
}

// Function to update a file with the new column names
function updateFile(fileInfo) {
  try {
    const fullPath = path.resolve(rootDir, fileInfo.path);
    let content = fs.readFileSync(fullPath, 'utf8');
    let updated = false;
    
    // Skip files that are part of the scripts we just created
    if (fileInfo.path.includes('rename-reservoir-columns.mjs') || 
        fileInfo.path.includes('update-code-for-column-rename.mjs')) {
      console.log(`Skipping script file: ${fileInfo.path}`);
      return { path: fileInfo.path, updated: false, skipped: true };
    }
    
    // Create a backup of the original file
    const backupPath = `${fullPath}.bak`;
    fs.writeFileSync(backupPath, content);
    
    // Replace 'formatted_id' with 'reservoir_id' only in SQL queries and database code
    // This is a complex replacement that needs context awareness
    if (fileInfo.containsFormattedId) {
      // Look for SQL queries or database code containing 'formatted_id'
      const formattedIdRegex = /(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|=|,|\(|\.)\s*['"`]?formatted_id['"`]?\s*([,\s=)]|$)/gi;
      content = content.replace(formattedIdRegex, (match, prefix, suffix) => {
        return `${prefix} reservoir_id${suffix}`;
      });
      
      // Also handle object property access
      const objPropertyRegex = /(\.\s*)formatted_id(\s*[,;)\]}]|$)/g;
      content = content.replace(objPropertyRegex, (match, prefix, suffix) => {
        return `${prefix}reservoir_id${suffix}`;
      });
      
      // Handle object literals
      const objLiteralRegex = /(\{\s*['"`]?)formatted_id(['"`]?\s*:)/g;
      content = content.replace(objLiteralRegex, (match, prefix, suffix) => {
        return `${prefix}reservoir_id${suffix}`;
      });
    }
    
    // Replace 'reservoir_id' with 'id' only in SQL queries and database code
    if (fileInfo.containsReservoirId) {
      // We need to be careful not to replace the 'reservoir_id' that we just renamed from 'formatted_id'
      // So we'll only replace 'reservoir_id' in contexts where it's clearly the primary key
      
      // Look for primary key contexts
      const primaryKeyRegex = /(PRIMARY\s+KEY|\.id|\bid\b|\s+id\s+|\(id\)|id\s*=|id:)\s*['"`]?reservoir_id['"`]?/gi;
      content = content.replace(primaryKeyRegex, (match) => {
        return match.replace('reservoir_id', 'id');
      });
      
      // Look for foreign key references
      const foreignKeyRegex = /(REFERENCES\s+reservoir_locations\s*\(\s*)['"`]?reservoir_id['"`]?(\s*\))/gi;
      content = content.replace(foreignKeyRegex, (match, prefix, suffix) => {
        return `${prefix}id${suffix}`;
      });
    }
    
    // Check if the content was actually modified
    updated = content !== fs.readFileSync(fullPath, 'utf8');
    
    if (updated) {
      // Write the updated content back to the file
      fs.writeFileSync(fullPath, content);
      console.log(`Updated file: ${fileInfo.path}`);
    } else {
      console.log(`No changes needed for: ${fileInfo.path}`);
    }
    
    return { path: fileInfo.path, updated };
    
  } catch (error) {
    console.error(`Error updating file ${fileInfo.path}:`, error.message);
    return { path: fileInfo.path, updated: false, error: error.message };
  }
}

// Main function to update code references
async function updateCodeReferences() {
  console.log('Starting code reference update for column renames...');
  
  // Find files that might need updates
  const filesToCheck = findFilesWithOldColumnNames();
  
  if (filesToCheck.length === 0) {
    console.log('No files found that need updates');
    return;
  }
  
  // Analyze each file to determine if it needs updates
  const fileAnalysis = filesToCheck.map(analyzeFile);
  const filesToUpdate = fileAnalysis.filter(info => info.needsUpdate);
  
  console.log(`Found ${filesToUpdate.length} files that need updates`);
  
  // Update each file
  const updateResults = filesToUpdate.map(updateFile);
  
  // Generate a summary report
  const updatedFiles = updateResults.filter(result => result.updated);
  const skippedFiles = updateResults.filter(result => result.skipped);
  const errorFiles = updateResults.filter(result => result.error);
  
  console.log('\nUpdate Summary:');
  console.log(`- ${updatedFiles.length} files updated`);
  console.log(`- ${skippedFiles.length} files skipped`);
  console.log(`- ${errorFiles.length} files with errors`);
  
  if (updatedFiles.length > 0) {
    console.log('\nUpdated Files:');
    updatedFiles.forEach(file => console.log(`- ${file.path}`));
  }
  
  if (errorFiles.length > 0) {
    console.log('\nFiles with Errors:');
    errorFiles.forEach(file => console.log(`- ${file.path}: ${file.error}`));
  }
  
  console.log('\nCode reference update completed');
}

// Run the function
updateCodeReferences().then(() => {
  console.log('Code reference update completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 