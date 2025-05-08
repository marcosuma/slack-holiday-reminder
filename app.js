const { App } = require('@slack/bolt');
const axios = require('axios');

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Function to get upcoming holidays
async function getUpcomingHolidays(countryCode, daysAhead) {
  const today = new Date();
  const year = today.getFullYear();
  
  try {
    // Using Nager.Date API (free, no API key required)
    const response = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    
    const endDate = new Date();
    endDate.setDate(today.getDate() + daysAhead);
    
    // Filter holidays within our date range
    const upcomingHolidays = response.data.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= today && holidayDate <= endDate;
    }).map(holiday => {
      const holidayDate = new Date(holiday.date);
      const daysUntil = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));
      
      return {
        name: holiday.name,
        date: holiday.date,
        daysUntil: daysUntil,
        formattedDate: holidayDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      };
    });
    
    return upcomingHolidays;
  } catch (error) {
    console.error(`Error fetching holidays: ${error}`);
    return [];
  }
}

// Format the message with holiday information
function formatHolidayMessage(holidays, daysAhead) {
  if (holidays.length === 0) {
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `No holidays found in the next ${daysAhead} days.`
          }
        }
      ]
    };
  }
  
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🗓️ Upcoming Holidays (Next ${daysAhead} Days) 🗓️`,
        emoji: true
      }
    },
    {
      type: "divider"
    }
  ];
  
  holidays.forEach(holiday => {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${holiday.name}*\n${holiday.formattedDate} (${holiday.daysUntil} days from now)`
      }
    });
  });
  
  return { blocks };
}

// Register the function for the workflow
app.function('Check for upcoming holidays', async ({ inputs, client }) => {
  // Extract inputs from the function call
  const daysAhead = inputs.days_ahead || 7;
  const countryCode = inputs.country_code || 'US';
  
  // Get upcoming holidays
  const holidays = await getUpcomingHolidays(countryCode, daysAhead);
  
  // Post the message to the channel where the workflow is configured
  if (holidays.length > 0) {
    try {
      // Get the channel ID where the workflow was triggered
      const channelId = process.env.HOLIDAY_BOT_CHANNEL || '#general';
      
      // Post the message
      await client.chat.postMessage({
        channel: channelId,
        ...formatHolidayMessage(holidays, daysAhead)
      });
      
      console.log(`Posted holiday information to channel: ${channelId}`);
    } catch (error) {
      console.error(`Error posting message: ${error}`);
    }
  } else {
    console.log(`No holidays found in the next ${daysAhead} days`);
  }
  
  // Return the output
  return {
    outputs: {
      holidays_found: holidays.length
    }
  };
});

// Handle app mentions to respond with holidays
app.event('app_mention', async ({ event, client }) => {
  try {
    const holidays = await getUpcomingHolidays('US', 7);
    
    await client.chat.postMessage({
      channel: event.channel,
      ...formatHolidayMessage(holidays, 7),
      text: `Here are the upcoming holidays in the next 7 days:`
    });
  } catch (error) {
    console.error(error);
  }
});

// Start the app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Holiday Bot app is running!');
})();
