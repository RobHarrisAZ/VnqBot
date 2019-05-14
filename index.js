require('dotenv').config();
const CronJob = require('node-cron');
const { Client, Channel, RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const TurndownService = require('turndown');
const { addDays, differenceInHours, differenceInMinutes, format, isSameDay } = require('date-fns');
const bbConvert = require('bbcode-to-markdown');

const turndownService = new TurndownService();
const client = new Client();
const gApiKey = process.env.GAPI_KEY;
const calendarId = process.env.CALENDAR_ID;

let calendarData = null;
let vCalendarData = null;
let filteredEvents = [];
let vFilteredEvents = [];
let channelTargets = [process.env.CHANNEL1, process.env.CHANNEL2];

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    loadEvents().then(() => {
        console.log(`Loaded events`);
    });
    CronJob.schedule('10 0 * * *', function () {
        loadEvents().then(() => {
            console.log(`Events Refreshed`);
        });
    }, null, true, 'America/Los_Angeles');
    CronJob.schedule('*/15 * * * *', checkEvents, null, true, 'America/Los_Angeles');
    CronJob.schedule('0 3 * * *', function () {
        channelTargets.forEach(item => {
            client.channels.get(item.id).send(getDayEvents(Date.now()));
        });
    }, null, true, 'America/Los_Angeles');
});

client.on('message', msg => {
    if (msg.content === '!help') {
        msg.channel.send(getHelpMessage());

    }
    if (msg.content === '!refresh') {
        vFilteredEvents.length = 0;
        loadEvents().then(() => {
            const embed2 = new RichEmbed()
                .setTitle('Calendar Retrieved!')
                .setColor(0x00FFFF)
                .setDescription(`Count: ${vFilteredEvents.length}`);
            msg.channel.send(embed2);
        });
    }
    if (msg.content.startsWith('!cal ') && !isNaN(msg.content.substr(msg.content.indexOf(' ') + 1))){
        const index = parseInt(msg.content.substr(msg.content.indexOf(' ') + 1));
        if (vCalendarData.event_objects.length > index + 1) {
            msg.channel.send(getVEventAlarm(vCalendarData.event_objects[index]));
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
    if (msg.content.startsWith('!channel')) {
        if (msg.content === '!channels') {
            msg.channel.send(getChannelList());
        }
        // if (msg.content === '!channels add') {
        //     channelTargets.push({ id: msg.channel.id, name: msg.channel.name });
        //     msg.channel.send(`${msg.channel.name} added to the broadcast list`);
        // }
        if (msg.content === '!channelinfo') {
            msg.channel.send(`${msg.channel.id} ${msg.channel.name}`);
        }
    }
    if (msg.content.startsWith('!ttp')) {
        msg.channel.send('Coming soon');
    }
});

client.login(process.env.BOT_TOKEN);

function loadEvents() {
    return getVEventData()
        .then(function () {
            vCalendarData.event_objects.forEach(processEvent);
            vFilteredEvents = vCalendarData.event_objects.filter(isFutureEvent);
            vFilteredEvents.sort(dateSort);
        });
}

function getChannelList() {
    let channelList = '';
    channelTargets.forEach(item => {
        channelList = channelList.concat(`ID:${item.id}, Name: ${item.name} <br/>`);
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
function getVEventAlarm(item) {
    if (!item.eventDate) {
        return getErrorMessage('Invalid Event- not scheduled');
    }
    const description = turndownService.turndown(
        `Start: ${format(new Date(item.eventDate), 'MM/DD/YYYY')}
            <br/>PT: ${format(new Date().setHours(item.pst.substr(0, 2), item.pst.substr(3, 2)), 'hh:mm a')}
            <br/>CT: ${format(new Date().setHours(item.cst.substr(0, 2), item.cst.substr(3, 2)), 'hh:mm a')}
            <br/>ET: ${format(new Date().setHours(item.est.substr(0, 2), item.est.substr(3, 2)), 'hh:mm a')}
            <br/><br/>${bbConvert(item.description)}`);
    return new RichEmbed()
        .setTitle(item.name)
        .setColor(0x00FFFF)
        .setDescription(description ? description.substr(0, 2048) : '');
}
function getDayEvents(day) {
    let description = '';
    if (day === undefined) {
        day = Date.now();
    }

    const todaysEvents = getEvents(day);

    todaysEvents.forEach(item => {
        item.info = `Event Name/Link: <a href="${item.link}">${item.name}</a>
        <br/>PT: ${format(new Date().setHours(item.pst.substr(0, 2),item.pst.substr(3, 2)), 'hh:mm a')}
        <br/>CT: ${format(new Date().setHours(item.cst.substr(0, 2),item.cst.substr(3, 2)), 'hh:mm a')}
        <br/>ET: ${format(new Date().setHours(item.est.substr(0, 2),item.est.substr(3, 2)), 'hh:mm a')}
        <br/><br/>`;
        description = description.concat(item.info);
    });

    return new RichEmbed()
        .setTitle(`${process.env.GUILD_NAME} Daily Events - ${format(day, 'MM/DD/YYYY')}\nToday's Activities`)
        .setColor(0xFF00FF)
        .setDescription(turndownService.turndown(description).substr(0, 2047));
}
function getEvents(day) {
    if (day === undefined) {
        day = Date.now();
    }
    
    return vCalendarData.event_objects.filter(item => {
        const eventDate = new Date(new Date(item.eventDate));
        return isSameDay(day, eventDate);
    }).sort(dateSort); 
}
function processTimezones(item) {
    let startDateTime = null;
    if (item.hasOwnProperty('start')) {
        startDateTime = new Date(item.start.dateTime);
    }
    if (item.hasOwnProperty('event_category_id')) {
        startDateTime = new Date(item.eventDate);
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
    const event = vFilteredEvents.find((row) => row.event_id === item.id);

    item.category = category ? category.name : '';

    if (event === undefined) {
        item.eventDate = null;
        item.link = null;
    } else {
        item.event_id = event.id;
        item.eventDate = event.date;
        item.link = `${process.env.GUILD_SITE}/events/${item.id}?event_instance_id=${item.event_id}`;
        processTimezones(item);
    }
}
function getVEventData() {
    return getVCalendarData()
        .then(cal => {
            vCalendarData = cal;
            vFilteredEvents = vCalendarData.events.filter(isFutureEvent);
            vFilteredEvents.sort(dateSort);
        });
}
function isFutureEvent(item) {
    const now = new Date();
    if (item.hasOwnProperty('kind') && item.kind === 'calendar#event' && item.status !== 'cancelled') {
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
    } else if (item.hasOwnProperty('event_id')) {
        const eventDate = new Date(item.date);
        return now.getTime() < eventDate.getTime();        
    }
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
function getHelpMessage() {
    return new RichEmbed()
    .setTitle('Vanquish Bot Commands')
    .setColor(0x750080)
        .setDescription(`
    \n!cal ###: Show event ### where ### is a number from 0 to ${vFilteredEvents.length}.
    \n!channels: Show channels that events will be broadcast to.
    \n!channelinfo: View the current channel's ID and name.
    \n!today: Show today's events.
    \n!today+#: Show events from # days in the future.
    \n!refresh: Force a reload of events.
    \n!help: Display this help info about commands. `);
}
function padZero(value, size) {
    while (value.length < (size || 2)) {
        value = "0" + value;
    }
    return value;
}
function dateSort(item1, item2) {
    if (item1.hasOwnProperty('start')) {
        if (differenceInHours(new Date(item1.start.dateTime), new Date(item2.start.dateTime)) > 0) {
            return 1;
        }
        if (differenceInHours(new Date(item1.start.dateTime), new Date(item2.start.dateTime)) < 0) {
            return -1;
        }
    } else if (item1.hasOwnProperty('eventDate')) { 
        if (differenceInMinutes(new Date(item1.eventDate), new Date(item2.eventDate)) > 0) {
            return 1;
        }
        if (differenceInMinutes(new Date(item1.eventDate), new Date(item2.eventDate)) < 0) {
            return -1;
        }
    }
      
    return 0;        
}
function checkEvents() {
    const now = Date.now();
    const eventList = getEvents(now);
    const upcoming = eventList.filter(item => {
        if (item.eventDate) {
            const eventDate = new Date(item.eventDate);
            return differenceInMinutes(eventDate, now) === 45;
        }
        return false;
    });
    if (upcoming.length) {
        upcoming.forEach(function (eventItem) {
            const embed = getVEventAlarm(eventItem);
            channelTargets.forEach(item => {
                client.channels.get(item.id).send(embed);
            });
        });
    }
}
