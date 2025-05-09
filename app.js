const { App } = require('@slack/bolt');
const { createEventAdapter } = require('@slack/events-api');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const express = require('express');

const FILENAME = 'holidays.json';
const COUNTRIES_OF_INTEREST = ['Ireland', 'Italy', 'Spain', 'USA'];
const DAYS_AHEAD = 30;

// Initialize the Slack Event Adapter
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

function checkHolidays(data, countriesOfInterest, today, daysAhead) {
  const results = [];
  const todayWeekday = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  const daysUntilNextWeek = 6 - todayWeekday;

  countriesOfInterest.forEach(country => {
    data[country].holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      const holidayWeekday = holidayDate.getDay();

      // Skip weekends
      if (holidayWeekday === 0 || holidayWeekday === 6) {
        return;
      }

      const daysDelta = Math.floor((holidayDate - today) / (1000 * 60 * 60 * 24));
      if (daysDelta >= daysUntilNextWeek && daysDelta <= daysUntilNextWeek + daysAhead) {
        // if holiday.region is null, just use country
        country_text = country
        if (holiday.region) {
          country_text = country + " / " + holiday.region;
        }
        results.push({ "name": holiday.name, "country": country_text, "date": holiday.date });
      }
    });
  });

  return results;
}

// Function to get upcoming holidays
async function getUpcomingHolidays(daysAhead, countryList) {
  const today = new Date();
  const year = today.getFullYear();

  try {
    const filePath = path.resolve(FILENAME);
    let data;

    if (fs.existsSync(filePath)) {
      console.log('file already exists');
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      const response = await fetch(process.env.HOLIDAY_API_URL);
      data = await response.json();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    const results = checkHolidays(data, countryList, today, daysAhead);

    const upcomingHolidays = results.map(holiday => {
      const holidayDate = new Date(holiday.date);
      const daysUntil = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));

      return {
        name: holiday.name,
        country: holiday.country,
        date: holiday.date,
        daysUntil: daysUntil,
        formattedDate: holidayDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };
    })

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
        text: `In *${holiday.country}*: *${holiday.name}*\n${holiday.formattedDate} (${holiday.daysUntil} days from now)`
      }
    });
  });

  return { blocks };
}

// Register the function for the workflow
app.function('Check for upcoming holidays', async ({ inputs, client }) => {
  // // Extract inputs from the function call
  const daysAhead = inputs.days_ahead || DAYS_AHEAD;
  // create a list of countries from the comma separated inputs.country_list
  const countryList = inputs.country_list ? inputs.country_list.split(',').map(country => country.trim()) : COUNTRIES_OF_INTEREST;

  // Get upcoming holidays
  const holidays = await getUpcomingHolidays(daysAhead, countryList);

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
slackEvents.on('app_mention', async (event) => {
  try {
    // from event.text extract the days_ahead and country_list
    const daysAheadMatch = event.text.match(/days_ahead=(\d+)/);
    // country_list from the input has a value between " and " and is comma separated
    // e.g. country_list="Ireland, Italy, Spain"
    // so we need to extract the value between the quotes
    // and split it by comma
    // and trim the spaces
    // e.g. country_list="Ireland, Italy, Spain" => ["Ireland", "Italy", "Spain"]
    // write the regex based on the comment above
    const countryListMatch = event.text.match(/country_list="([^"]+)"/);
    const daysAhead = daysAheadMatch ? parseInt(daysAheadMatch[1]) : DAYS_AHEAD;
    const countryList = countryListMatch
      ? countryListMatch[1].split(',').map((country) => country.trim())
      : COUNTRIES_OF_INTEREST;

    const holidays = await getUpcomingHolidays(daysAhead, countryList);

    await app.client.chat.postMessage({
      channel: event.channel,
      ...formatHolidayMessage(holidays, daysAhead),
      text: `Here are the upcoming holidays in the next ${daysAhead} days:`
    });
  } catch (error) {
    console.error(error);
  }
});

// Middleware to handle Slack's URL verification
slackEvents.on('url_verification', (event, respond) => {
  respond({ challenge: event.challenge });
});

// Attach the Slack Event Adapter to your Express app
const server = express();
server.use('/slack/events', slackEvents.expressMiddleware());
server.use(bodyParser.json());

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`⚡️ Holiday Bot is running on port ${PORT}`);
});

