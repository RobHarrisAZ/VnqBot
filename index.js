require('dotenv').config();
const CronJob = require('node-cron');
const { Client, RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const TurndownService = require('turndown');
const { addDays, differenceInDays, differenceInMinutes, format, isSameDay } = require('date-fns');
const bbConvert = require('bbcode-to-markdown');

const turndownService = new TurndownService();
const client = new Client();

let vCalendarData = null;
let channelTargets = [process.env.CHANNEL1, process.env.CHANNEL2];
let pledgeData = null;
let pledgeItems = [];
let esoData = null;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    loadData();
    loadEvents().then(() => {
        console.log(`Loaded events`);
        //getPledges();
    });
    CronJob.schedule('10 0 * * *', function () {
        loadEvents().then(() => {
            console.log(`Events Refreshed`);
        });
    }, null, true, 'America/Los_Angeles');
    CronJob.schedule('*/15 * * * *', checkEvents, null, true, 'America/Los_Angeles');
    CronJob.schedule('0 3 * * *', function () {
        channelTargets.forEach(item => {
            client.channels.get(item).send(getDayEvents(Date.now()));
        });
    }, null, true, 'America/Los_Angeles');
});

client.on('message', msg => {
    if (msg.content === '!help') {
        msg.channel.send(getHelpMessage());

    }
    if (msg.content === '!refresh') {
        loadEvents().then(() => {
            const embed2 = new RichEmbed()
                .setTitle('Calendar Retrieved!')
                .setColor(0x00FFFF)
                .setDescription(`Count: ${vCalendarData.events.length}`);
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
            msg.channel.send(getDayEvents(new Date(Date.now())));
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
    if (msg.content === '!checkevents') {
        checkEvents();
    }
    if (msg.content.startsWith('!ttp')) {
        msg.channel.send('Coming soon');
    }
    if (msg.content === '!pledges') {
        msg.channel.send(new RichEmbed()
        .setTitle(`Today's Pledges`)
        .setColor(0x20F41F)
        .setDescription(turndownService.turndown(getDailyPledges(Date.now()))));       
    }
});

client.login(process.env.BOT_TOKEN);

function loadEvents() {
    return getVEventData()
        .then(function () {
            vCalendarData.events.forEach(processEvents);
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
        day = new Date(Date.now());
    }

    const todaysEvents = getEvents(day);

    todaysEvents.forEach(item => {
        const info = `Event Name/Link: <a href="${item.event.link}">${item.event.name}</a>
        <br/>PT: ${format(new Date().setHours(item.event.pst.substr(0, 2),item.event.pst.substr(3, 2)), 'hh:mm a')}
        <br/>CT: ${format(new Date().setHours(item.event.cst.substr(0, 2),item.event.cst.substr(3, 2)), 'hh:mm a')}
        <br/>ET: ${format(new Date().setHours(item.event.est.substr(0, 2),item.event.est.substr(3, 2)), 'hh:mm a')}
        <br/><br/>`;
        description = description.concat(info);
    });

    description = description.concat(getPledgeText()).concat(`<b>Pledges:</b><br/>`).concat(getDailyPledges(day));
    //description = description.concat(getWeekly());

    return new RichEmbed()
        .setTitle(`${process.env.GUILD_NAME} Daily Events - ${format(day, 'MM/DD/YYYY')}\nToday's Activities`)
        .setColor(0xFF00FF)
        .setDescription(turndownService.turndown(description).substr(0, 2047));
}
function getEvents(day) {
    if (day === undefined) {
        day = Date.now();
    }
    
    return vCalendarData.events.filter(item => {
        const eventDate = new Date(item.eventDate);
        return isSameDay(day, eventDate);
    }).sort(dateSort); 
}
function getPledgeText() {
    return '';
}
function processTimezones(item) {
    let startDateTime = new Date(item.eventDate);
    
    const startHour = startDateTime.getHours();
    const startMinutes = padZero(startDateTime.getMinutes().toString(), 2);

    item.pst = `${padZero(startHour.toString(), 2)}:${startMinutes}`;
    //item.mst = `${startHour}:${startMinutes}`;
    item.cst = `${padZero((startHour + 2).toString(), 2)}:${startMinutes}`;
    item.est = `${padZero((startHour + 3).toString(), 2)}:${startMinutes}`;
}
function processEvents(item) {
    const eventObj = vCalendarData.event_objects.find((row) => row.id === item.event_id);
    const category = vCalendarData.event_categories.find((row) => row.id === eventObj.event_category_id);

    item.eventDate = item.date;
    item.event = eventObj;
    item.event.eventDate = item.eventDate;
    item.event.category = category ? category.name : 'None';

    item.event.link = `${process.env.GUILD_SITE}/events/${item.event_id}?event_instance_id=${item.id}`;
    processTimezones(item.event);
}
function getPledges(pageToken) {
    pageToken = pageToken || '';
    const uri = `https://www.googleapis.com/calendar/v3/calendars/${process.env.CALENDAR_ID}/events?key=${process.env.GAPI_KEY}&pageToken=${pageToken}`;
    httpGet(uri)
        .then(data => {
            pledgeData = pledgeData || data;
            pledgeItems = pledgeItems.concat(data.items);
            if (data.nextPageToken) {
                getPledges(data.nextPageToken);
            } else {
                pledgeData.items = pledgeItems.filter(item => item.start).sort(dateSort);
                pledges = googleCalendarListSort.organizeByDate(pledgeData).filter(isFutureEvent);
            }
        });
}
function getVEventData() {
    return httpGet(`${process.env.GUILD_SITE}/events.json`)
        .then(cal => {
            vCalendarData = cal;
        });
}
function isFutureEvent(item) {
    const now = new Date();
    if (item.hasOwnProperty('date')) {
        const dateString = `${item.date.substr(2, 2)}/${item.date.substr(0, 2)}/${item.date.substr(4, 4)}`;
        const eventDate = new Date(dateString);
        console.log(dateString);
        return now.getTime() < eventDate.getTime();        
    }
};
function httpGet(uri) {
    return fetch(uri,
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
    \n!cal ###: Show event ### where ### is a number from 0 to ${vCalendarData.events.length}.
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
    if (item1.hasOwnProperty('eventDate')) { 
        if (differenceInMinutes(new Date(item1.eventDate), new Date(item2.eventDate)) > 0) {
            return 1;
        }
        if (differenceInMinutes(new Date(item1.eventDate), new Date(item2.eventDate)) < 0) {
            return -1;
        }
    } else if (item1.start && item2.start) { 
        if (item1.start.datetime && item2.start.datetime) {
            //const dateString1 = `${item1.date.substr(2, 2)}/${item1.date.substr(0, 2)}/${item1.date.substr(4, 4)}`;
            //const dateString2 = `${item2.date.substr(2, 2)}/${item2.date.substr(0, 2)}/${item2.date.substr(4, 4)}`;
            if (differenceInDays(new Date(item1.start.datetime), new Date(item2.start.datetime)) >= 0) {
                return 1;
            }
            if (differenceInMinutes(new Date(item1.start.datetime), new Date(item2.start.datetime)) <= 0) {
                return -1;
            }
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
            diff = differenceInMinutes(eventDate, now);
            return diff >= 40 && diff < 60;
        }
        return false;
    });
    if (upcoming.length) {
        upcoming.forEach(function (eventItem) {
            const embed = getVEventAlarm(eventItem.event);
            channelTargets.forEach(channelId => {
                client.channels.get(channelId).send(embed);
            });
        });
    }
}
function loadData() {
    esoData = {
        instances:  {
            "aa": "Aetherian Archive",
            "hrc": "Hel Ra Citadel",
            "so": "Sanctum Ophidia",
            "mol": "Maw of Lorkhaj",
            "hof": "Halls of Fabrication",
            "as": "Asylum Sanctorium",
            "cr": "Cloudrest",
            "dsa": "Dragonstar Arena",
            "msa": "Maelstrom Arena",
            "weekly": "Weekly Trial",
            "weeklymsa": "Weekly Maelstrom Arena",
            // Maj
            "fg2": 'Fungal Grotto II',
            "sc1": 'Spindleclutch I',
            "dc2": 'Darkshade Caverns II',
            "eh1": 'Elden Hollow I',
            "ws2": 'Wayrest Sewers II',
            "fg1": 'Fungal Grotto I',
            "bc2": 'Banished Cells II',
            "dc1": 'Darkshade Cavern I',
            "eh2": 'Elden Hollow II',
            "ws1": 'Wayrest Sewers I',
            "sc2": 'Spindleclutch II',
            "bc1": 'Banished Cells I',
            // Glirion 
            "coh2": 'Crypt of Hearts II',
            "coa1": 'City of Ash I',
            "ti": 'Tempest Island',
            "bh": 'Blackheart Haven',
            "arx": 'Arx Corinium',
            "sw": "Selene's Web",
            "coa2": 'City of Ash II',
            "coh1": 'Crypt of Hearts I',
            "vol": 'Volenfell',
            "bc": 'Blessed Crucible',
            "dire": 'Direfrost Keep',
            "vom": 'Vaults of Madness',
            // DLC
            "fh": 'Falkreath Hold',
            "bf": 'Bloodroot Forge',
            "cos": 'Cradle of Shadows',
            "icp": 'Imperial City Prison',
            "rom": 'Ruins of Mazzatun',
            "wgt": 'White-Gold Tower',
            "fl": 'Fang Lair',
            "sp": 'Scalecaller Peak',
            "mhk": 'Moon Hunter Keep',
            "ms": 'March of Sacrifices',
            "dm": 'Depths of Malatar',
            "fv": 'Frostvault'
        },
        pledgeQuestGiver: ["Maj al-Ragath", "Glirion the Redbeard", "Urgarlag Chief-Bane"],
        pledges: [{
            pledgeQuestGiver: 0,
            instances: ['fg2', 'sc1', 'dc2', 'eh1', 'ws2', 'fg1', 'bc2', 'dc1', 'eh2', 'ws1', 'sc2', 'bc1']
        }, {
            pledgeQuestGiver: 1,
            instances: ['coh2', 'coa1', 'ti', 'bh', 'arx', 'sw', 'coa2', 'coh1', 'vol', 'bc', 'dire', 'vom']
        }, {
            pledgeQuestGiver: 2,
            instances: ['fv', 'icp', 'rom', 'wgt', 'cos', 'bf', 'fh', 'fl', 'sp', 'mhk', 'ms', 'dm']
        }]
    };
}
function getDailyPledges(dateTime) {
    // this time calculation has been taken from Seri's code
    // const resetTime = '11:00pm';
    // const resetZone = 'America/Los_Angeles';
    //let elapsed = time - baseTimestamp;
    //Math.floor(elapsed / 86400);

    // This is hard coded order. Right now there are 12 dungeons on each quest giver. That makes the calculation easy.
    // That will change with each patch and the calculation for DLC will be different.
    const baseDate = new Date('05/07/2019');
    if (!dateTime) {
        dateTime = Date.now();
    }

    let diff_rot = differenceInDays(dateTime, baseDate);
    
    pledgeText = [];
    pledgeNext = [];
    for (var i = 0; i < esoData.pledgeQuestGiver.length;i++){
        pledgeText.push("* " + getDungeon(i, diff_rot) + " (by " + esoData.pledgeQuestGiver[i] + ")"); 
        pledgeNext.push(getDungeon(i, diff_rot + 1));
    }
        
    //let remainingH = 23 - Math.floor((elapsed % 86400) / 3600);
    //let remainingM = 59 - Math.floor(((elapsed % 86400) / 60) % 60);
    
    return pledgeText.join('<br/>').concat('<br/><b>Tomorrow:</b><br/>').concat(pledgeNext.join(", "));
    // + " in " + remainingH + " hours and " + remainingM + " minutes.";

}
function getDungeon(questGiver, dungeonIndex) {
    dungeonIndex = dungeonIndex % 12;
    return esoData.instances[esoData.pledges[questGiver].instances[dungeonIndex]];
}