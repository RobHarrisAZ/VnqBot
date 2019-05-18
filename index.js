require('dotenv').config();
const CronJob = require('node-cron');
const { Client, RichEmbed } = require('discord.js');
const { addDays } = require('date-fns');
const utils = require('./modules/utility');
const channelUtils = require('./modules/channels');
const pledgeUtils = require('./modules/pledges');
const ttp = require('./modules/ttp');
const events = require('./modules/events');

const guildSite = process.env.GUILD_SITE;
const guildName = process.env.GUILD_NAME;
const client = new Client();

let vCalendarData = null;
let channelTargets = [process.env.CHANNEL1, process.env.CHANNEL2];

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    loadEvents().then((data) => {
        console.log(`Loaded events`);
        scheduleJobs(data);
    });
});

client.on('message', msg => {
    switch (msg.content) {
        case '!help':
            msg.channel.send(getHelpMessage());
            break;
        case '!refresh':
            loadEvents().then(() => {
                const embed2 = new RichEmbed()
                    .setTitle('Events Retrieved!')
                    .setColor(0x00FFFF)
                    .setDescription(`Count: ${vCalendarData.events.length}`);
                msg.channel.send(embed2);
            });
            break;
        case '!today':
            msg.channel.send(events.getDayEvents(new Date(Date.now()), guildName, vCalendarData.events));
            break;
        case '!channelinfo':
            msg.channel.send(`${msg.channel.id} ${msg.channel.name}`);
            break;
        case '!checkevents':
            events.checkEvents(channelTargets, vCalendarData.events, msg.client);
            break;
        case '!pledges':
            let pledges = pledgeUtils.getDailyPledges(Date.now());
            msg.channel.send(new RichEmbed()
                .addField(`Today's Pledges:`, pledges[0])
                .addField(`Tomorrow:`, pledges[1])
                .setTitle(`Pledges`)
                .setColor(0x20F41F));
            break;
        default:
            if (msg.content.startsWith('!cal ') && !isNaN(msg.content.substr(msg.content.indexOf(' ') + 1))) {
                const index = parseInt(msg.content.substr(msg.content.indexOf(' ') + 1));
                if (vCalendarData.events.length > index + 1) {
                    msg.channel.send(events.getEventAlarm(vCalendarData.events[index]));
                } else {
                    msg.reply(utils.getErrorMessage('Invalid event'));
                }
            }            
            if (msg.content.startsWith('!today+') && !isNaN(msg.content.substr(msg.content.indexOf('+') + 1))) {
                const numberOfDays = parseInt(msg.content.substr(msg.content.indexOf('+') + 1));
                msg.channel.send(events.getDayEvents(addDays(Date.now(), numberOfDays), guildName));
            }
            if (msg.content.startsWith('!ttp')) {
                if (msg.content.substr(msg.content.indexOf(' ') + 1).length > 3) {
                    let groupSizeIndex = msg.content.indexOf('--');
                    let groupSize = 4;
                    let groupSizeText = null;
                    if (msg.content.indexOf('--') > 0) {
                        groupSizeText = msg.content.substr(groupSizeIndex + 2);
                        if (isNaN(groupSizeText)) {
                            msg.channel.send(utils.getErrorMessage(`Invalid group size`));
                            return;
                        }
                        groupSize = Number(groupSizeText);
                    } 
                    const channelName = groupSizeText ? msg.content.substring(msg.content.indexOf(' ') + 1, groupSizeIndex).trimRight() : msg.content.substr(msg.content.indexOf(' ') + 1);
                    const channelId = channelUtils.getChannelID(channelName, msg.client.channels);
                    if (channelId !== null) {
                        const userList = channelUtils.getUserList(channelId, msg.client);
                        //msg.channel.send(getUserListText(userList));
                        msg.channel.send(ttp.getGroupFormationText(utils.shuffle(utils.shuffle(userList)), channelName, groupSize));
                    } else {
                        msg.channel.send('Channel not found');
                    }
                } else {
                    msg.channel.send(utils.getErrorMessage(`Must provide a channel name`))
                }
            }
            break;
    }
});

client.login(process.env.BOT_TOKEN);

function scheduleJobs(data) {
    // Daily event load @ 12:10am PT
    CronJob.schedule('10 0 * * *', function () {
        loadEvents().then(() => {
            console.log(`Events Refreshed`);
        });
    }, null, true, 'America/Los_Angeles');
    // Check for upcoming events every 15 minutes
    CronJob.schedule('*/15 * * * *', events.checkEvents(channelTargets, data.events, client), null, true, 'America/Los_Angeles');
    // Daily Today's Activities @ 3am PT
    CronJob.schedule('0 3 * * *', function () {
        channelTargets.forEach(item => {
            client.channels.get(item).send(events.getDayEvents(Date.now(), guildName));
        });
    }, null, true, 'America/Los_Angeles');
}
function loadEvents() {
    return events.getEventData(guildSite)
        .then(function (data) {
            vCalendarData = data;
            vCalendarData.guildName = guildName;
            vCalendarData.guildSite = guildSite;
            vCalendarData.events.forEach(events.processEvents, vCalendarData);
            vCalendarData.events.sort(utils.dateSort);
            return vCalendarData;
        });
}
function getHelpMessage() {
    return new RichEmbed()
        .setTitle('Vanquish Bot Commands')
        .addField(`!help`, `Display this help info about commands.`)
        .addField(`!cal ####`, `Show event ### where ### is a number from 0 to ${vCalendarData.events.length}.`)
        .addField(`!channelinfo`, `View the current channel's ID and name.`)
        .addField(`!refresh`, `Force a reload of events. This happens automatically daily.`)
        .addField(`!pledges`, `Show today's pledges.`)
        .addField(`!today`, `Show today's events.`)
        .addField(`!today+#`, `Show events from # days in the future.`)
        .addField(`!ttp <*channel name*> [--*groupSize*]`, `Form up random groups from the list of users in *channel name*. 
        This is not case sensitive but does respect the whitespace in a name. The default *groupSize* is 4 if none is provided.`)
        .setColor(0x750080);
}
// function getUserListText(userList) {
//     let description = `Channel Members:<br/>`;
//     let users = ``;
//     userList.forEach(item => {
//         users += `${item.name}<br/>`
//     });

//     return new RichEmbed()
//         .setTitle('Channel Members')
//         .setColor(0x750080)
//         .setDescription(turndownService.turndown(`${description}${users}`));
// }
// function getPledges(pageToken) {
//     pageToken = pageToken || '';
//     const uri = `https://www.googleapis.com/calendar/v3/calendars/${process.env.CALENDAR_ID}/events?key=${process.env.GAPI_KEY}&pageToken=${pageToken}`;
//     httpGet(uri)
//         .then(data => {
//             pledgeData = pledgeData || data;
//             pledgeItems = pledgeItems.concat(data.items);
//             if (data.nextPageToken) {
//                 getPledges(data.nextPageToken);
//             } else {
//                 pledgeData.items = pledgeItems.filter(item => item.start).sort(utils.dateSort);
//                 pledges = googleCalendarListSort.organizeByDate(pledgeData).filter(isFutureEvent);
//             }
//         });
// }
// function isFutureEvent(item) {
//     const now = new Date();
//     if (item.hasOwnProperty('date')) {
//         const dateString = `${item.date.substr(2, 2)}/${item.date.substr(0, 2)}/${item.date.substr(4, 4)}`;
//         const eventDate = new Date(dateString);
//         console.log(dateString);
//         return now.getTime() < eventDate.getTime();        
//     }
// };
// function getChannelList() {
//     let channelList = '';
//     channelTargets.forEach(item => {
//         channelList = channelList.concat(`ID:${item.id}, Name: ${item.name} <br/>`);
//     });
//     return new RichEmbed()
//         .setTitle('Channel List')
//         .setColor(0xFF00FF)
//         .setDescription(turndownService.turndown(channelList));
// }