require('dotenv').config();
const { Client, RichEmbed } = require('discord.js');
const client = new Client();
const fetch = require('node-fetch');
// const { google } = require('googleapis');
// const gClientId = process.env.GAPI_CLIENT_ID;
// const gClientSec = process.env.GAPI_CLIENT_SECRET;
// const scopes = 'https://www.googleapis.com/auth/calendar';
// const cal = google.calendar({
//     version: 'v3',
//     auth: gApiKey
// })

const gApiKey = process.env.GAPI_KEY;
const calendarId = process.env.CALENDAR_ID;
const weeklyMilliseconds = 604800000;

let calendarData = null;
let filteredEvents = [];

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content === '!r') {
        filteredEvents.length = 0;
        getEventData('')
            .then(function () {
                filteredEvents.forEach(item => {
                    const embed = new RichEmbed()
                    // Set the title of the field
                    .setTitle(item.summary)
                    // Set the color of the embed
                    .setColor(0x00FFFF)
                    // Set the main content of the embed
                    .setDescription(`Start Time: ${item.start.dateTime} \n${item.description}`);
                  // Send the embed to the same channel as the message
                    
                    msg.channel.send(embed);
    
                })
                const embed = new RichEmbed()
                // Set the title of the field
                .setTitle('Calendar Retrieved!')
                // Set the color of the embed
                .setColor(0x00FFFF)
                // Set the main content of the embed
                .setDescription(`Count: ${filteredEvents.length}`);
              // Send the embed to the same channel as the message
                msg.channel.send(embed);
                //msg.reply('Calendar Retrieved!');
                //msg.reply('Count: ' + filteredEvents.length);                    
        })
    }
});

client.login(process.env.BOT_TOKEN);

function getEventData(pageToken) {
    return getCalendarData(pageToken)
    .then(cal => {
        calendarData = cal;
        events = calendarData.items.filter(isFutureEvent);
        filteredEvents = filteredEvents.concat(events);
        if (calendarData.nextPageToken) {
            return getEventData(calendarData.nextPageToken);
        }
    });
}

function isFutureEvent(item) {
    if (item.kind === 'calendar#event' && item.status !== 'cancelled') {
        const now = new Date();
        const eventDate = new Date(item.start.dateTime);
        //console.log(now.getTime() + ' ' + eventDate.getTime());
        return now.getTime() < eventDate.getTime();
    } else {
        return false;
    }
}
function getCalendarData(pageToken) {
    return fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${gApiKey}&pageToken=${pageToken}`,
        {
            method: 'GET',
            headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => {
            return response.json();
        })
        .catch(err => {
            console.log(err);
        });
};
