require("dotenv").config();
const pjson = require("./package.json");
const CronJob = require("node-cron");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} = require("discord.js");
const { addDays, isAfter } = require("date-fns");
const { join } = require("node:path");
const utils = require("./modules/utility");
const channelUtils = require("./modules/channels");
const pledgeUtils = require("./modules/pledges");
const ttp = require("./modules/ttp");
const eventUtils = require("./modules/events");
const mediaUtil = require("./modules/media");
const events = new eventUtils();

const guildSite = process.env.GUILD_SITE;
const guildName = process.env.GUILD_NAME;
const client = new Client({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});
const fnf_url = join(__dirname, `vanquish_fnf.mp3`); //`http://infidelux.net/vanquish_fnf.mp3`;
const music_url = [
  join(__dirname, `A_Friday_Night_Fight_Christmas.mp3`),
  join(__dirname, `Christmas_At_The_Chalamo.mp3`),
  join (__dirname, `Qrystmas_In_The_Queue_-_Vanquish_2022.mp3`),
  // `http://infidelux.net/A_Friday_Night_Fight_Christmas.mp3`,
  // `http://infidelux.net/Christmas_At_The_Chalamo.mp3`,
];

let vCalendarData = null;
let channelTargets = [process.env.CHANNEL1, process.env.CHANNEL2];
let applicantData = [];

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  loadEvents().then((data) => {
    console.log(`Loaded events`);
    scheduleJobs(data);
  });
});

client.on("messageCreate", (msg) => {
  let zoneText = "";

  switch (msg.content.toLowerCase()) {
    case "/vnqhelp":
    case "!vnqhelp":
      msg.channel.send({ embeds: [getHelpMessage()] });
      break;
    case "/refresh":
    case "!refresh":
      loadEvents().then(() => {
        const embed2 = new EmbedBuilder()
          .setTitle("Events Retrieved!")
          .setColor(0x00ffff)
          .setDescription(`Count: ${vCalendarData.events.length}`);
        msg.channel.send({ embeds: [embed2] });
      });
      break;
    case "/today":
    case "!today":
      msg.channel.send({
        embeds: [
          events.getDayEvents(
            new Date(Date.now()),
            guildName,
            vCalendarData.events
          ),
        ],
      });
      break;
    case "/channelinfo":
    case "!channelinfo":
      msg.channel.send(`${msg.channel.id} ${msg.channel.name}`);
      break;
    case "/checkevents":
    case "!checkevents":
      events.checkEvents(channelTargets, vCalendarData.events, msg.client);
      break;
    case "/pledges":
    case "!pledges":
      let pledges = pledgeUtils.getDailyPledges(Date.now());
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .addFields({ name: `Today's Pledges:`, value: pledges[0] })
            .addFields({ name: `Tomorrow:`, value: pledges[1] })
            .setTitle(`Pledges`)
            .setColor(0x20f41f),
        ],
      });
      break;
    case "/rnd d":
    case "!rnd d":
    // Random Dungeon selector
    case "/rnd t":
    case "!rnd t":
    // Random Trial selector
    case "/rnd b":
    case "!rnd b":
    // Random Trial Boss selector
    // case '!birthday':
    //     msg.channel.send({embeds: [new EmbedBuilder()
    //         .setTitle(`Happy Birthday Vanquish!`)
    //         .setDescription(`OUR EVENTS FOR THE DAY:\n\n11:00am – 1:00pm EST: SMS (Saturday Morning Smackdown) Join with Infi as he takes us through overland in three different zones to take down World Bosses.\n\n1:30pm – 3:00pm EST: MNM (Monday Night Madness) With Cy taking over the lead, join us as we do another run of World Bosses through DLC’s for the daily coffers.\n\n3:30pm – 4:30pm EST: Lawn Darts. It’s an old Vanquish Tradition as we plummet to our deaths to land on the corpse of our fearless leader, Savina. Prizes are yet to be determined.\n\n5:00pm – 6:30pm EST: Vanquish Dome! You’ve heard of Mad Max. Now be him as we meet in Stormhaven to fight one on one gladiator style. Wearing only a Barbaric Helm (supplied) and a weapon (random), face your opponent using your weapon or skills that can fit on 1 bar. It’s fun. It’s glorious. It’s Vanquish Dome! Prizes are yet to be determined.\n\n7:00pm EST: VANQUISH ROLL CALL. Gather up at the Vanquish Bridge, Daggerfall bridge, near the Impresario, and wear your Guild Tabards. Show your Vanquish colors as Savina leads us forward. Guild meeting will be done in Guild Chat to prevent potential ‘spamming’. Please NO Pets of any kind.\n\n7:45pm – 8:30pm EST: Vanquish Murder Mystery. Another old favorite from the past. Join us as Duck leads us on an adventure to search for clues on where the assassin is hiding. Finish him/her off and avenge the attempted assassination of ONE of our Vanquish Members. Prizes are yet to be determined.\n\n9:00pm – 11:00pm EST: FNF (Friday Night Fights) It’s Friday on Saturday! Head to Cyrodiil, standard 30 day, as DanTheMan has a repeat performance of FNF. Fly your Lion Banners, wear your guild tabards, as we knock EP and AD back to their gates.\n\n11:30pm – 1:00am EST: Saturday Night Trials. Get geared! A couple weeks ago we had two full groups hitting 3 trials each. Refill those drinks and join Infi and Kildaan as we lead multiple groups through several normal trials for everyone!`)
    //         .setColor(0x20F41F)]});
    //     break;
    case "/roll":
    case "!roll":
      const result = utils.getRandomInteger(1, 100).toString();
      const memberName = msg.member.displayName;
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${memberName} rolls **${result}** (1-100)`)
            .setColor(0x007dd0),
        ],
      });
      break;
    case "/sms":
    case "!sms":
      const smsZones = events.getSmsZones();
      smsZones.forEach((zone) => (zoneText += "\n" + zone));
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Saturday Morning Smackdown Zones for this week:`)
            .setDescription(zoneText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/sms list":
    case "!sms list":
      zoneText = events.getSmsZones({ all: true });
      //zoneText = '';
      //smsAllZones.forEach(zone => zoneText += '\n' + zone);
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Saturday Morning Smackdown Zones Order:`)
            .setDescription(zoneText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/mnm":
    case "!mnm":
      const activityText = events.getMnmActivities();
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Monday Night Madness Zones for this week:`)
            .setDescription(activityText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/mnm list":
    case "!mnm list":
      const mnmAllActivityText = events.getMnmActivities({ all: true });
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`MNM Zone Order:`)
            .setDescription(mnmAllActivityText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/spd":
    case "!spd":
      const spdActivityText = events.getSpdActivities({});
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Next SPD Zone:`)
            .setDescription(spdActivityText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/spddlc":
    case "!spddlc":
      const spdDlcActivityText = events.getSpdActivities({}, true);
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Next SPD DLC Zone:`)
            .setDescription(spdDlcActivityText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/spd list":
    case "!spd list":
      const spdAllActivityText = events.getSpdActivities({ all: true });
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`SPD Zone Order:`)
            .setDescription(spdAllActivityText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/spddlc list":
    case "!spddlc list":
      const spdDlcAllActivityText = events.getSpdActivities(
        { all: true },
        true
      );
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`SPD DLC Zone Order:`)
            .setDescription(spdDlcAllActivityText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/udt":
    case "!udt":
      const udtActivityText = `* We meet up in Wayrest near the Undaunted Enclave. 
            * One person in the group at a time picks up a daily delve quest from Bolgrul and shares it with the group.
            * The group travels to the delve target and completes the quest and returns to Wayrest to turn in the quest.
            * Then the next person in the group, at the direction of the leader, picks up the next quest and the cycle repeats until we've exhausted all of the available quests to the group.`;
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Undaunted Tuesday Information:`)
            .setDescription(udtActivityText)
            .setColor(0x00ffff),
        ],
      });
      break;
    case "/fnf intro":
    case "!fnf intro":
      // Check for officer permissions first
      if (
        msg.member.roles.cache.some((role) => role.name === "Officers") ||
        msg.member.roles.cache.some((role) => role.name === "Admin")
      ) {
        const channelToSend = msg.member.voice.channel;
        mediaUtil.play(channelToSend, [fnf_url]);
      }
      break;
    case "/vnqmusic":
    case "!vnqmusic":
      // Check for officer permissions first
      if (
        msg.member.roles.cache.some((role) => role.name === "Officers") ||
        msg.member.roles.cache.some((role) => role.name === "Admin")
      ) {
        const channelToSend = msg.member.voice.channel;
        // Play all songs
        mediaUtil.play(channelToSend, music_url);
      }
      break;
    case "/version":
    case "!version":
      const version = pjson.version;
      const versionText = `VNQBot Version ${version}`;
      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`VNQBot`)
            .setDescription(versionText)
            .setColor(0xff00ff),
        ],
      });
      break;
    default:
      if (
        msg.content.startsWith("!roll ") ||
        msg.content.startsWith("/roll ")
      ) {
        // && !isNaN(msg.content.substr(msg.content.indexOf(' ') + 1))) {
        // Determine if there is one parameter or two
        const lastIndex = msg.content.lastIndexOf(" ");
        const index = msg.content.indexOf(" ");
        const parameters = msg.content.substring(index + 1);
        const memberName = msg.member.displayName;
        let min = 1;
        let max = 100;
        let result = "0";

        if (lastIndex === index) {
          if (!isNaN(parameters)) {
            max = parseInt(parameters);
          }

          result = utils.getRandomInteger(min, max).toString();
        } else {
          if (!isNaN(parameters.substring(0, parameters.indexOf(" ")))) {
            min = parseInt(parameters.substring(0, parameters.indexOf(" ")));
          }
          if (!isNaN(parameters.substring(parameters.lastIndexOf(" ") + 1))) {
            max = parseInt(
              parameters.substring(parameters.lastIndexOf(" ") + 1)
            );
          }

          result = utils.getRandomInteger(min, max).toString();
        }

        msg.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${memberName} rolls **${result}** (${min}-${max})`
              )
              .setColor(0x007dd0),
          ],
        });
      }
      if (msg.content.startsWith("!vnqmusic ")) {
        if (
          msg.member.roles.cache.some((role) => role.name === "Officers") ||
          msg.member.roles.cache.some((role) => role.name === "Admin")
        ) {
          const channelToSend = msg.member.voice.channel;
          const lastIndex = msg.content.lastIndexOf(" ");
          const index = msg.content.indexOf(" ");
          const parameters = msg.content.substring(index + 1);

          if (!isNaN(parameters)) {
            if (parameters > 0 && parameters <= music_url.length) {
              mediaUtil.play(channelToSend, [music_url[parameters - 1]]);
            }
          }
        }
      }
      if (
        (msg.content.startsWith("!cal ") || msg.content.startsWith("/cal ")) &&
        !isNaN(msg.content.substring(msg.content.indexOf(" ") + 1))
      ) {
        const index = parseInt(
          msg.content.substring(msg.content.indexOf(" ") + 1)
        );
        if (vCalendarData.events.length > index + 1) {
          msg.channel.send({
            embeds: [events.getEventAlarm(vCalendarData.events[index])],
          });
        } else {
          msg.reply(utils.getErrorMessage("Invalid event"));
        }
      }
      if (
        (msg.content.startsWith("!today+") ||
          msg.content.startsWith("/today+")) &&
        !isNaN(msg.content.substring(msg.content.indexOf("+") + 1))
      ) {
        const numberOfDays = parseInt(
          msg.content.substring(msg.content.indexOf("+") + 1)
        );
        msg.channel.send({
          embeds: [
            events.getDayEvents(
              addDays(Date.now(), numberOfDays),
              guildName,
              vCalendarData.events
            ),
          ],
        });
      }
      if (msg.content.startsWith("!ttp") || msg.content.startsWith("/ttp")) {
        if (msg.content.substring(msg.content.indexOf(" ") + 1).length > 3) {
          let groupSizeIndex = msg.content.indexOf("--");
          let groupSize = 4;
          let groupSizeText = null;
          if (msg.content.indexOf("--") > 0) {
            groupSizeText = msg.content.substring(groupSizeIndex + 2);
            if (isNaN(groupSizeText)) {
              msg.channel.send({
                embeds: [utils.getErrorMessage(`Invalid group size`)],
              });
              return;
            }
            groupSize = Number(groupSizeText);
          }
          const channelName = groupSizeText
            ? msg.content
                .substring(msg.content.indexOf(" ") + 1, groupSizeIndex)
                .trimRight()
            : msg.content.substring(msg.content.indexOf(" ") + 1);
          const channelId = channelUtils.getChannelID(
            channelName,
            msg.client.channels
          );
          if (channelId !== null) {
            const userList = channelUtils.getUserList(channelId, msg.client);
            msg.channel.send({
              embeds: [
                ttp.getGroupFormationText(
                  utils.shuffle(utils.shuffle(userList)),
                  channelName,
                  groupSize
                ),
              ],
            });
          } else {
            msg.channel.send("Channel not found");
          }
        } else {
          msg.channel.send({
            embeds: [utils.getErrorMessage(`Must provide a channel name`)],
          });
        }
      }
      break;
  }
});

client.login(process.env.BOT_TOKEN);

function scheduleJobs(data) {
  // Daily event load @ 12:10am PT
  CronJob.schedule(
    "10 0 * * *",
    function () {
      loadEvents().then(() => {
        console.log(`Events Refreshed`);
      });
    },
    null,
    true,
    "America/Los_Angeles"
  );
  // Check for upcoming events every 15 minutes
  CronJob.schedule(
    "*/15 * * * *",
    function () {
      console.log("Checking upcoming events");
      const upcoming = events.checkEvents(
        channelTargets,
        vCalendarData.events,
        client
      );
      upcoming.forEach(function (eventItem) {
        const embed = events.getEventAlarm(eventItem);
        channelTargets.forEach((channelId) => {
          let channel = client.channels.cache.get(channelId);
          channel.send({ embeds: [embed] });
        });
      });
    },
    null,
    true,
    "America/Los_Angeles"
  );
  // Daily Today's Activities @ 5am PT
  CronJob.schedule(
    "0 5 * * *",
    function () {
      console.log(`Posting today's activities`);
      channelTargets.forEach((channelId) => {
        let channel = client.channels.cache.get(channelId);
        channel.send({
          embeds: [
            events.getDayEvents(Date.now(), guildName, vCalendarData.events),
          ],
        });
      });
    },
    null,
    true,
    "America/Los_Angeles"
  );
  // Hourly check for new applications
  // CronJob.schedule(
  //   "*/60 * * * *",
  //   function () {
  //     console.log(`Checking for new open applications`);
  //     const currentApps = applicantData.map((row) => row.id);
  //     appUtils.processOpenApplications(guildSite).then((appData) => {
  //       const newApps = appData.filter((app) => !currentApps.includes(app.id));
  //       applicantData = [...appData];
  //       if (newApps.length) {
  //         let channel = client.channels.cache.get(process.env.CHANNEL3);
  //         newApps.forEach((app) => {
  //           appUtils
  //             .formatApplication(app.id, guildSite)
  //             .then((message) => channel.send(message));
  //         });
  //       }
  //     });
  //   },
  //   null,
  //   true,
  //   "America/Los_Angeles"
  // );
}

loadEvents = () => {
  return events.getEventData(guildSite).then(function (data) {
    vCalendarData = data;
    vCalendarData.guildName = guildName;
    vCalendarData.guildSite = guildSite;
    vCalendarData.events = vCalendarData.events.filter(utils.isFutureDate);
    vCalendarData.events.forEach(events.processEvents, vCalendarData);
    vCalendarData.events.sort(utils.dateSort);
    return vCalendarData;
  });
};
function getHelpMessage() {
  return new EmbedBuilder()
    .setTitle("Vanquish Bot Commands")
    .setDescription(`All commands are case insensitive`)
    .addFields({
      name: `/vnqhelp`,
      value: `Display this help info about commands.`,
    })
    .addFields({
      name: `!cal *eventIndex*`,
      value: `Show event *eventIndex* where *eventIndex* is a number from 0 to ${vCalendarData.events.length}.`,
    })
    .addFields({
      name: `/channelinfo`,
      value: `View the current channel's ID and name.`,
    })
    .addFields({ name: `/mnm`, value: `Show this week's MNM Zones.` })
    .addFields({ name: `/mnm list`, value: `Show MNM Zone Order.` })
    .addFields({ name: `/pledges`, value: `Show today's pledges.` })
    .addFields({
      name: `!refresh`,
      value: `Force a reload of events. This happens automatically daily.`,
    })
    .addFields({ name: `/roll`, value: `Roll a random number 1-100.` })
    .addFields({
      name: `/roll *min* *max*`,
      value: `Roll a random number between *min* and *max*. (Ex. !roll 10 20.)`,
    })
    .addFields({ name: `/sms`, value: `Show this week's SMS Zones.` })
    .addFields({ name: `/sms list`, value: `Show SMS Zone Order.` })
    .addFields({ name: `/spddlc`, value: `Show the upcoming SPD Zone.` })
    .addFields({ name: `/spd`, value: `Show the upcoming SPD Zone.` })
    .addFields({ name: `/spd list`, value: `Show the order of SPD Zones.` })
    .addFields({ name: `/today`, value: `Show today's events.` })
    .addFields({
      name: `/today+*days*`,
      value: `Show events from # days in the future.`,
    })
    .addFields({
      name: `/ttp <*channel name*> [--*groupSize*]`,
      value: `Form up random groups from the list of users in *channel name*. 
        This is not case sensitive but does respect the whitespace in a name. The default *groupSize* is 4 if none is provided.`,
    })
    .addFields({ name: `/udt`, value: `Show Undaunted Tuesday Information.` })
    .addFields({ name: `/version`, value: `Show Bot version info.` })
    .setColor(0x750080);
}

// function getUserListText(userList) {
//     let description = `Channel Members:<br/>`;
//     let users = ``;
//     userList.forEach(item => {
//         users += `${item.name}<br/>`
//     });

//     return new EmbedBuilder()
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
//     return new EmbedBuilder()
//         .setTitle('Channel List')
//         .setColor(0xFF00FF)
//         .setDescription(turndownService.turndown(channelList));
// }

//  TODO: Get latest activity from the website and output to a channel on interval
