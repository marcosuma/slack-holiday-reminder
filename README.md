# Holiday Bot for Slack

A Slack app that automatically checks for upcoming holidays and sends notifications to your channel. This bot uses Slack's built-in workflow scheduler so it runs entirely within Slack!

## Features

- **Daily Notifications**: Automatically sends notifications about upcoming holidays
- **Customizable**: Set how many days ahead to check and which country to use
- **Slack Native**: Runs as a proper Slack app using Slack's workflow builder and scheduled functions
- **No External Server Required**: Leverages Slack's socket mode for easy deployment

## Setup Instructions

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From an app manifest"
3. Select your workspace and click "Next"
4. Copy and paste the contents of `manifest.json` from this repository
5. Review the permissions and click "Create"

### 2. Install the App to Your Workspace

1. Navigate to "OAuth & Permissions" in the sidebar
2. Click "Install to Workspace"
3. Authorize the app with the requested permissions

### 3. Get Your App Credentials

You'll need three credentials:
- **Bot Token**: Found under "OAuth & Permissions" → "Bot User OAuth Token" (starts with `xoxb-`)
- **Signing Secret**: Found under "Basic Information" → "App Credentials" → "Signing Secret"
- **App-Level Token**: 
  1. Go to "Basic Information" → "App-Level Tokens"
  2. Click "Generate Token and Scopes"
  3. Name it "connections"
  4. Add the `connections:write` scope
  5. Click "Generate"
  6. Copy the token (starts with `xapp-`)

### 4. Configure the Bot

1. Edit the `.env` file with your credentials:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_APP_TOKEN=xapp-your-app-token
   HOLIDAY_BOT_CHANNEL=#your-channel-name
   ```

### 5. Deploy the App

#### Option 1: Run locally (for testing)

1. Install dependencies:
   ```
   npm install
   ```

2. Start the app:
   ```
   npm start
   ```

#### Option 2: Deploy to a hosting service

You can deploy this app to services like:
- Heroku
- Vercel
- Glitch
- Render
- Railway

Most services allow you to set environment variables in their dashboard.

### 6. Configure the Workflow in Slack

After installing and deploying your app:

1. In Slack, go to your workspace
2. Click on "Tools" in the sidebar
3. Select "Workflow Builder"
4. You should see "Daily holiday check" workflow already set up
5. Click on it to customize:
   - You can change the schedule time
   - You can modify which channel receives notifications
   - You can adjust the country code and days ahead

## Using the Bot

The bot will automatically run on the schedule you set in the workflow.

You can also mention the bot in any channel to get an immediate check of upcoming holidays:
```
@Holiday Bot What holidays are coming up?
```

## Customization

You can customize:
- **Notification Time**: Change when daily notifications are sent
- **Channel**: Choose which channel receives holiday notifications
- **Country**: Set which country's holidays to check (using ISO country codes like "US", "GB", "CA")
- **Days Ahead**: How many days in the future to check for holidays

## Troubleshooting

- **Bot not responding**: Make sure your app is running and connected to Slack
- **No holidays showing up**: Verify the country code is correct and that there are holidays in the specified date range
- **Schedule not running**: Check the workflow configuration in Slack's Workflow Builder
