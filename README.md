# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7b5d0202-ca5b-4396-ac20-3f084936064f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7b5d0202-ca5b-4396-ac20-3f084936064f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7b5d0202-ca5b-4396-ac20-3f084936064f) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

## Recent Updates

### 2025-03-25: Scheduler Service for Automated Data Collection
- Added a scheduler service to automate data collection from multiple sources
- Created configurable job scheduling with cron expressions for telemetry, rainfall, and reservoir data
- Implemented comprehensive logging system for monitoring job execution
- Added system boot autostart functionality for Linux, macOS, and Windows
- Integrated all three data sources: telemetry stations, rainfall stations, and reservoirs

#### Scheduler Service Usage

The scheduler service allows you to automate data collection tasks from all available data sources. Here's how to use it:

1. **Install dependencies (first time only):**
   ```bash
   npm run scheduler:install
   ```

2. **View available jobs:**
   ```bash
   npm run scheduler:list
   ```

3. **Check the scheduler status:**
   ```bash
   cd apps/backend && npm run scheduler:status
   ```

4. **Run the backend scheduler service (recommended):**
   ```bash
   cd apps/backend && npm run scheduler:start
   ```

> **Note:** The root scheduler commands (`npm run scheduler:run` and `npm run scheduler:run-once`) are deprecated and have been moved to legacy components. Please use the backend scheduler instead as shown above.

The scheduler configuration is stored in `scripts/scheduler-config.json`. You can modify this file to add, remove, or change scheduled jobs.

#### Available Data Collection Jobs

The scheduler manages the following types of data collection:

1. **Telemetry Data**
   - Fetches water level and flow data from the RID API 
   - All hydro regions are synced hourly at 5 minutes past each hour
   - Stores data in the telemetry_data table

2. **Rainfall Data**
   - Collects precipitation measurements hourly from multiple sources:
     - ThaiWater API at the top of every hour (00 minutes)
     - TMD API at 15 minutes past every hour
   - Updates the thaiwater_rainfall_data table

3. **Reservoir Data**
   - Retrieves reservoir and dam information from the RID API once daily at 9:00 AM
   - Maintains water storage, inflow, and outflow data
   - Updates the reservoir_data table

### 2025-03-22: Telemetry Data Fetching Automation
- Added scripts to automatically fetch telemetry data from RID API
- Implemented data fetching by hydro region ID with OAuth 1.0a authentication
- Created database integration to store fetched telemetry readings
- Added comprehensive error handling and reporting
- Support for fetching data for specific dates
- See below for usage instructions

#### Telemetry Data Fetching Scripts

Two npm commands are available for fetching telemetry data:

1. **Fetch data for a specific hydro region:**
   ```bash
   npm run fetch-telemetry -- [hydro_id] [--date YYYY-MM-DD]
   ```
   
   Examples:
   ```bash
   # Fetch today's data for hydro region 1
   npm run fetch-telemetry -- 1
   
   # Fetch data for a specific date for hydro region 2
   npm run fetch-telemetry -- 2 --date 2025-03-20
   ```

2. **Fetch data for all hydro regions (1-8):**
   ```bash
   npm run fetch-all-telemetry [--date YYYY-MM-DD]
   ```
   
   Examples:
   ```bash
   # Fetch today's data for all hydro regions
   npm run fetch-all-telemetry
   
   # Fetch data for a specific date for all hydro regions
   npm run fetch-all-telemetry -- --date 2025-03-20
   ```

Note: The scripts require database access and will create station records if they don't exist.

#### Individual Data Sync Commands

You can manually run these commands to fetch data from different sources:

1. **Telemetry data (RID API):**
   ```bash
   npm run sync:hydroid
   ```

2. **Reservoir data (RID API):**
   ```bash
   npm run sync:reservoir
   ```

3. **Rainfall data:**
   ```bash
   # ThaiWater API
   npm run sync:thaiwater
   
   # TMD API
   npm run sync:tmd
   ```

### 2025-03-02: Map Post Filtering Enhancement
- Enhanced post filtering logic to ensure posts with only tumbon information (without amphure or province) are not displayed on the map
- Improved accuracy of map visualization by only showing posts with sufficient location data
- Added multiple layers of filtering in both frontend and backend
- Enhanced logging for better debugging and monitoring
- See `.tasks/2025-03-02_3_map_post_filtering_enhancement.md` for detailed information

### 2025-03-02: Login and Password Change Improvements
- Enhanced authentication system with improved Login and Password Change functionality
- Added better form validation with descriptive error messages
- Implemented secure token handling and storage
- Added password strength validation and visual indicators
- Improved error handling and user feedback
- See `.tasks/2025-03-02_4_login_password_change_improvements.md` for detailed information

### 2025-03-02: Dashboard Message Counting Optimization
- Optimized Dashboard performance by reducing excessive message counting operations
- Reduced verbose console logging to improve browser performance
- Enhanced API integration with proper base URL and error handling
- Improved category count display with better loading states and error handling
- Added performance optimizations for large datasets
- See `.tasks/2025-03-02_5_dashboard_message_counting_optimization.md` for detailed information
