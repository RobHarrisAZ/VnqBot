require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const { google } = require('googleapis');
const gClientId = process.env.GAPI_CLIENT_ID;
const gClientSec = process.env.GAPI_CLIENT_SECRET;
const gApiKey = process.env.GAPI_KEY;
const scopes = 'https://www.googleapis.com/auth/calendar';
const cal = google.calendar({
    version: 'v3',
    auth: gApiKey
})
const params = {
    calendarId: process.env.CALENDAR_ID
};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content === 'ping') {
        //msg.reply('Pong!');
        //checkAuth();
        getCalendarData();
    }
});

client.login(process.env.BOT_TOKEN);

async function getCalendarData() {
    handleAuthClick();
    //const calData = await cal.calendars.get({ calendarId: params.calendarId });
    //console.log(calData);
    // gapi.client.load('calendar', 'v3', function() {
    //     var request = gapi.client.calendar.events.list({
    //       'calendarId': process.env.CALENDAR_ID
    //     });
              
    //     request.execute(function(resp) {
    //       for (var i = 0; i < resp.items.length; i++) {
    //         var li = document.createElement('li');
    //         li.appendChild(document.createTextNode(resp.items[i].summary));
    //         document.getElementById('events').appendChild(li);
    //       }
    //     });
    //   });
};

handleClientLoad = () => {
    google.client.setApiKey(apiKey);
    window.setTimeout(checkAuth, 1);
    checkAuth();
};
  
checkAuth = () => {
    gapi.auth.authorize({ client_id: clientId, scope: scopes, immediate: true },
        handleAuthResult);
};
  
handleAuthResult = (authResult) => {
    if (authResult) {
        getCalendarData();
    }
};
  
handleAuthClick = (event) => {
    google.auth.(
         { clientId: gClientId, clientSecret: gClientSec, redirectUrl: '' },
         handleAuthResult);
    google.client.init({
        'apiKey': gApiKey,
        // clientId and scope are optional if auth is not required.
        'clientId': gClientId,
        'scope': 'profile',
    }).then(function () {
        // 3. Initialize and make the API request.
        return google.client.request({
            'path': 'https://calendar.googleapis.com/v3/calendar/' + params.calendarId,
        })
    }).then(function (response) {
        console.log(response.result);
    }, function (reason) {
        console.log('Error: ' + reason.result.error.message);
    });
};
