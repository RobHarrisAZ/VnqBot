require('dotenv').config();
const { Client, RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const TurndownService = require('turndown');
const { addDays, differenceInHours, format, isSameDay } = require('date-fns');
const bbConvert = require('bbcode-to-markdown');

const turndownService = new TurndownService();
const client = new Client();
const gApiKey = process.env.GAPI_KEY;
const calendarId = process.env.CALENDAR_ID;

let calendarData = null;
let vCalendarData = null;
let filteredEvents = [];
let vFilteredEvents = [];
let channelTargets = [];

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    getEventData('')
        .then(function () {
            filteredEvents.forEach(processTimezones);
            filteredEvents.sort(dateSort);
            console.log(`Loaded events`);
        });
    getVEventData()
        .then(function () {
            vCalendarData.event_objects.forEach(processTimezones);
            vCalendarData.event_objects.forEach(processEvent);
        })
});

client.on('message', msg => {
    if (msg.content === '!help') {
        msg.channel.send(getHelpMessage());

    }
    if (msg.content === '!refresh') {
        filteredEvents.length = 0;
        getEventData('')
            .then(function () {
                filteredEvents.forEach(processTimezones);
                filteredEvents.sort(dateSort);
                const embed2 = new RichEmbed()
                .setTitle('Calendar Retrieved!')
                .setColor(0x00FFFF)
                .setDescription(`Count: ${filteredEvents.length}`);
                msg.channel.send(embed2);
        })
    }
    if (msg.content.startsWith('!cal ') && !isNaN(msg.content.substr(msg.content.indexOf(' ') + 1))){
        const index = parseInt(msg.content.substr(msg.content.indexOf(' ') + 1));
        if (filteredEvents.length > index + 1) {
            msg.channel.send(getEventAlarm(filteredEvents[index]));
        } else {
            msg.reply(getErrorMessage('Invalid event'));
        }
    }
    if (msg.content.startsWith('!today')) {
        if (msg.content === '!today') {
            msg.channel.send(getDayEvents(Date.now()));
        } else if (msg.content.startsWith('!today+') && !isNaN(msg.content.substr(msg.content.indexOf('+') + 1))) {
            const numberOfDays = parseInt(msg.content.substr(msg.content.indexOf('+') + 1));
            msg.channel.send(getDayEvents(addDays(Date.now(), numberOfDays)));
        }
    }
    if (msg.content.startsWith('!channels')) {
        if (msg.content === '!channels') {
            msg.channel.send(getChannelList());
        }
        if (msg.content === '!channels add') {
            channelTargets.push(msg.channel.name);
            msg.channel.send(`${msg.channel.name} added to the broadcast list`);
        }
    }

});

client.login(process.env.BOT_TOKEN);

function getChannelList() {
    let channelList = '';
    channelTargets.forEach(item => {
        channelList = channelList.concat(item, '<br/>');
    });
    return new RichEmbed()
        .setTitle('Channel List')
        .setColor(0xFF00FF)
        .setDescription(turndownService.turndown(channelList));
}
function getErrorMessage(message) {
    return new RichEmbed()
        .setTitle(message)
        .setColor(0xFF0000)
        .setDescription(``);
}
function getEventAlarm(item) {
    return new RichEmbed()
    .setTitle(item.summary)
    .setColor(0x00FFFF)
        .setDescription(
            decodeURIComponent(
                turndownService.turndown(
                    `Start: ${format(new Date(item.start.dateTime), 'MM/DD/YYYY')}
                    <br/>PT: ${item.pst}
                    <br/>CT: ${item.cst}
                    <br/>ET: ${item.est}
                    <br/><br/>${item.description}`)));
}
function getDayEvents(day) {
    let description = '';
    if (day === undefined) {
        day = Date.now();
    }
    
    const todaysEvents = filteredEvents.filter(item => {
        const eventDate = new Date(new Date(item.start.dateTime));
        return isSameDay(day, eventDate);            
    }).sort(dateSort);

    todaysEvents.forEach(item => {
        item.info = `Event Name/Link: <a href="${item.htmlLink}">${item.summary}</a>
        <br/>PT: ${item.pst}
        <br/>CT: ${item.cst}
        <br/>ET: ${item.est}
        <br/><br/>`;
        description = description.concat(item.info);
    });

    return new RichEmbed()
        .setTitle(`${process.env.GUILD_NAME} Daily Events - ${format(day, 'MM/DD/YYYY')}\nToday's Activities`)
        .setColor(0xFF00FF)
        .setDescription(turndownService.turndown(description));
}
function getHelpMessage() {
    return new RichEmbed()
    .setTitle('Vanquish Bot Commands')
    .setColor(0x750080)
        .setDescription(`!refresh: Refresh the data from Google Calendar.
    \n!cal ###: Show event ### where ### is a number from 0 to ${filteredEvents.length}.
    \n!channels: Show channels that events will be broadcast to.
    \n!channels add: Add the current channel to the broadcast list.
    \n!today: Show today's events.
    \n!today+#: Show events from # days in the future.
    \n!help: Display this help info about commands. `);
}
function processTimezones(item) {
    let startDateTime = null;
    if (item.hasOwnProperty('start')) {
        startDateTime = new Date(item.start.dateTime);
    }
    if (item.hasOwnProperty('event_category_id')) {
        startDateTime = new Date(item.date);
    }
    const startHour = startDateTime.getHours();
    const startMinutes = padZero(startDateTime.getMinutes().toString(), 2);

    item.pst = `${padZero(startHour.toString())}:${startMinutes}`;
    //item.mst = `${startHour}:${startMinutes}`;
    item.cst = `${padZero((startHour + 2).toString(), 2)}:${startMinutes}`;
    item.est = `${padZero((startHour + 3).toString(), 2)}:${startMinutes}`;
}
function processEvent(item) {
    const category = vCalendarData.event_categories.find((row) => row.id === item.event_category_id);
    item.category = category ? category.name : '';
    item.event_id = vCalendarData.events.find((row) => row.event_id === item.id).id;
    item.link = `${process.env.GUILD_SITE}/events/${item.id}?event_instance_id=${item.event_id}`;
}
function getEventData(pageToken) {
    return getCalendarData(pageToken)
    .then(cal => {
        calendarData = cal;
        const events = calendarData.items.filter(isFutureEvent);
        filteredEvents = filteredEvents.concat(events);
        if (calendarData.nextPageToken) {
            return getEventData(calendarData.nextPageToken);
        }
    });
}
function getVEventData() {
    return getVCalendarData()
        .then(cal => {
            vCalendarData = cal;
        });
}
function isFutureEvent(item) {
    if (item.kind === 'calendar#event' && item.status !== 'cancelled') {
        const now = new Date();
        const eventDate = new Date(item.start.dateTime);
        const endDate = null;

        if (item.recurrence && item.recurrence.length) {
            for (let index = 0; index < item.recurrence.length; index++) {
                let endDateStart = -1;
                let endDateEnd = -1;
                endDateStart = item.recurrence[index].indexOf('UNTIL=');
                if (endDateStart > -1) {
                    endDateEnd = item.recurrence[index].indexOf(';', endDateStart);
                    endDate = new Date(item.recurrence[index].substring(endDateStart+6, endDateEnd));
                }
                if (endDate !== null) {
                    break;
                }
            }
        }
        return now.getTime() < eventDate.getTime() ||
            (endDate !== null && now.getTime() < endDate.getTime());
    } else {
        return false;
    }
};
function getCalendarData(pageToken) {
    return fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?singleEvents=true&key=${gApiKey}&pageToken=${pageToken}`,
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
function getVCalendarData() {
    return fetch(`${process.env.GUILD_SITE}/events.json`,
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
}
function padZero(value, size) {
    while (value.length < (size || 2)) {
        value = "0" + value;
    }
    return value;
}
function dateSort(item1, item2) {
    if (differenceInHours(new Date(item1.start.dateTime), new Date(item2.start.dateTime)) > 0) {
        return 1;
    }
    if (differenceInHours(new Date(item1.start.dateTime), new Date(item2.start.dateTime)) < 0) {
        return -1;
    }
      
    return 0;        
}

