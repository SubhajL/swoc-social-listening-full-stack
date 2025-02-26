import { spawn } from 'child_process';
import { logger } from '../utils/logger';

/**
 * Script to run all the necessary setup steps for the ThaiWater integration
 * in the correct sequence.
 */

// Define the commands to run in sequence
const commands = [
  { name: 'Install PostGIS', script: 'install-postgis' },
  { name: 'Create Amphure Table', script: 'create-amphure-table' },
  { name: 'Test ThaiWater Location', script: 'test-thaiwater-location' }
];

/**
 * Run a command using npm run
 */
function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`Running: npm run ${command}`);
    
    const process = spawn('npm', ['run', command], {
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        logger.info(`Command '${command}' completed successfully`);
        resolve();
      } else {
        logger.error(`Command '${command}' failed with code ${code}`);
        reject(new Error(`Command '${command}' failed with code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      logger.error(`Failed to start command '${command}'`, err);
      reject(err);
    });
  });
}

/**
 * Run all commands in sequence
 */
async function runSetup() {
  logger.info('Starting ThaiWater setup process');
  
  for (const [index, command] of commands.entries()) {
    logger.info(`Step ${index + 1}/${commands.length}: ${command.name}`);
    
    try {
      await runCommand(command.script);
    } catch (error) {
      logger.error(`Setup failed at step ${index + 1}: ${command.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    }
  }
  
  logger.info('ThaiWater setup completed successfully');
}

// Run the setup
runSetup(); 