# Setting up Google Maps API Key

This guide will help you set up a Google Maps API key for the location data update script.

## Prerequisites
- A Google Cloud Platform (GCP) account
- A GCP project (create one if you don't have it)
- Billing enabled on your GCP project

## Steps

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click on the project dropdown at the top of the page
   - Click "New Project" or select an existing project
   - If creating new, name it something like "swoc-location-data"
   - Click "Create"

3. **Enable the Geocoding API**
   - Go to the [Google Maps Platform](https://console.cloud.google.com/google/maps-apis/overview)
   - Select your project
   - Click "Enable APIs and Services"
   - Search for "Geocoding API"
   - Click on "Geocoding API"
   - Click "Enable"

4. **Create API Key**
   - Go to the [Credentials page](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials"
   - Select "API key"
   - Copy the generated API key

5. **Restrict the API Key (Recommended)**
   - Click on the newly created API key
   - Under "Application restrictions", select "IP addresses"
   - Add your server's IP address
   - Under "API restrictions", select "Restrict key"
   - Select "Geocoding API" from the dropdown
   - Click "Save"

6. **Add API Key to Environment Variables**
   - Open `apps/backend/.env`
   - Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key:
     ```
     GOOGLE_MAPS_API_KEY="your-actual-api-key"
     ```

## Usage
The API key will be used by the `update-location-data` script to:
- Fetch coordinates for provincial halls
- Fetch coordinates for district offices
- Handle geocoding requests with proper rate limiting

## Important Notes
- Keep your API key secure and never commit it to version control
- Monitor your API usage in the Google Cloud Console
- The script includes rate limiting (200ms between requests) to respect quotas
- Free tier limits: 40,000 requests per month
- Enable billing alerts to avoid unexpected charges

## Troubleshooting
If you encounter issues:
1. Verify the API key is correctly set in `.env`
2. Check if the Geocoding API is enabled
3. Verify IP restrictions if set
4. Monitor the API quotas in Google Cloud Console
5. Check the script logs for specific error messages 