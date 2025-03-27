# Server Deployment Guide

This guide explains how to deploy the data sync scheduler on a server using PM2.

## Prerequisites

1. Node.js >= 20.10.0
2. PM2 (will be installed via npm)
3. Proper environment variables set up
4. Database access configured

## Installation Steps

1. Install dependencies:
```bash
npm install
```

2. Install PM2 globally (if not already installed):
```bash
npm install -g pm2
```

3. Set up PM2 to start on system boot:
```bash
npm run pm2:setup
```

4. Start the scheduler with PM2:
```bash
npm run pm2:start
```

5. Save the PM2 process list to ensure it persists across reboots:
```bash
npm run pm2:save
```

## Management Commands

- Check scheduler status:
```bash
npm run pm2:status
```

- View scheduler logs:
```bash
npm run pm2:logs
```

- Restart scheduler:
```bash
npm run pm2:restart
```

- Stop scheduler:
```bash
npm run pm2:stop
```

## Troubleshooting

1. If the scheduler isn't starting on boot:
   - Check PM2 startup script: `pm2 startup`
   - Verify saved process list: `pm2 save`
   - Check system logs: `journalctl -u pm2-$USER`

2. If the scheduler crashes:
   - Check PM2 logs: `pm2 logs swoc-data-sync`
   - Verify environment variables
   - Check database connectivity

3. If memory issues occur:
   - Adjust `max_memory_restart` in ecosystem.config.js
   - Monitor memory usage: `pm2 monit`

## Logging

- Application logs: `logs/pm2-out.log`
- Error logs: `logs/pm2-error.log`
- PM2 logs: `~/.pm2/logs/`

## Security Considerations

1. Ensure proper file permissions:
```bash
chmod 755 src/scripts/schedule-data-sync.mjs
chmod 644 ecosystem.config.js
```

2. Secure environment variables:
   - Use a secure .env file
   - Consider using a secrets management service

3. Network security:
   - Configure firewall rules
   - Use VPN if needed for database access

## Backup and Recovery

1. Backup PM2 process list:
```bash
pm2 save > pm2-process-list.json
```

2. Restore PM2 process list:
```bash
pm2 resurrect
```

## Monitoring

1. Monitor processes:
```bash
pm2 monit
```

2. Monitor logs in real-time:
```bash
pm2 logs
```

3. Check resource usage:
```bash
pm2 status
``` 