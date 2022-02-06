require("dotenv").config();
const pjson = require("./package.json");
const CronJob = require("node-cron");
const {
  Client,
  MessageEmbed,
  StreamDispatcher,
  Message,
} = require("discord.js");
const { addDays, isAfter } = require("date-fns");
const utils = require("./modules/utility");
const channelUtils = require("./modules/channels");
const pledgeUtils = require("./modules/pledges");
const ttp = require("./modules/ttp");
const eventUtils = require("./modules/events");
const applicantUtils = require("./modules/apps");
const events = new eventUtils();
const appUtils = new applicantUtils();

const guildSite = process.env.GUILD_SITE;
const guildName = process.env.GUILD_NAME;
const client = new Client();
const fnf_url = `http://infidelux.net/vanquish_fnf.mp3`;

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

client.on("message", (msg) => {
  let zoneText = "";

  switch (msg.content.toLowerCase()) {
    case "/vnqhelp":
    case "!vnqhelp":
      msg.channel.send(getHelpMessage());
      break;
    case "/refresh":
    case "!refresh":
      loadEvents().then(() => {
        const embed2 = new MessageEmbed()
          .setTitle("Events Retrieved!")
          .setColor(0x00ffff)
          .setDescription(`Count: ${vCalendarData.events.length}`);
        msg.channel.send(embed2);
      });
      break;
    case "/today":
    case "!today":
      msg.channel.send(
        events.getDayEvents(
          new Date(Date.now()),
          guildName,
          vCalendarData.events
        )
      );
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
      msg.channel.send(
        new MessageEmbed()
          .addField(`Today's Pledges:`, pledges[0])
          .addField(`Tomorrow:`, pledges[1])
          .setTitle(`Pledges`)
          .setColor(0x20f41f)
      );
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
    //     msg.channel.send(new MessageEmbed()
    //         .setTitle(`Happy Birthday Vanquish!`)
    //         .setDescription(`OUR EVENTS FOR THE DAY:\n\n11:00am – 1:00pm EST: SMS (Saturday Morning Smackdown) Join with Infi as he takes us through overland in three different zones to take down World Bosses.\n\n1:30pm – 3:00pm EST: MNM (Monday Night Madness) With Cy taking over the lead, join us as we do another run of World Bosses through DLC’s for the daily coffers.\n\n3:30pm – 4:30pm EST: Lawn Darts. It’s an old Vanquish Tradition as we plummet to our deaths to land on the corpse of our fearless leader, Savina. Prizes are yet to be determined.\n\n5:00pm – 6:30pm EST: Vanquish Dome! You’ve heard of Mad Max. Now be him as we meet in Stormhaven to fight one on one gladiator style. Wearing only a Barbaric Helm (supplied) and a weapon (random), face your opponent using your weapon or skills that can fit on 1 bar. It’s fun. It’s glorious. It’s Vanquish Dome! Prizes are yet to be determined.\n\n7:00pm EST: VANQUISH ROLL CALL. Gather up at the Vanquish Bridge, Daggerfall bridge, near the Impresario, and wear your Guild Tabards. Show your Vanquish colors as Savina leads us forward. Guild meeting will be done in Guild Chat to prevent potential ‘spamming’. Please NO Pets of any kind.\n\n7:45pm – 8:30pm EST: Vanquish Murder Mystery. Another old favorite from the past. Join us as Duck leads us on an adventure to search for clues on where the assassin is hiding. Finish him/her off and avenge the attempted assassination of ONE of our Vanquish Members. Prizes are yet to be determined.\n\n9:00pm – 11:00pm EST: FNF (Friday Night Fights) It’s Friday on Saturday! Head to Cyrodiil, standard 30 day, as DanTheMan has a repeat performance of FNF. Fly your Lion Banners, wear your guild tabards, as we knock EP and AD back to their gates.\n\n11:30pm – 1:00am EST: Saturday Night Trials. Get geared! A couple weeks ago we had two full groups hitting 3 trials each. Refill those drinks and join Infi and Kildaan as we lead multiple groups through several normal trials for everyone!`)
    //         .setColor(0x20F41F));
    //     break;
    case "/roll":
    case "!roll":
      const result = utils.getRandomInteger(1, 100).toString();
      const memberName = msg.member.displayName;
      msg.channel.send(
        new MessageEmbed()
          .setDescription(`${memberName} rolls **${result}** (1-100)`)
          .setColor(0x007dd0)
      );
      break;
    case "/sms":
    case "!sms":
      const smsZones = events.getSmsZones();
      smsZones.forEach((zone) => (zoneText += "\n" + zone));
      msg.channel.send(
        new MessageEmbed()
          .setTitle(`Saturday Morning Smackdown Zones for this week:`)
          .setDescription(zoneText)
          .setColor(0x00ffff)
      );
      break;
    case "/sms list":
    case "!sms list":
      zoneText = events.getSmsZones({ all: true });
      //zoneText = '';
      //smsAllZones.forEach(zone => zoneText += '\n' + zone);
      msg.channel.send(
        new MessageEmbed()
          .setTitle(`Saturday Morning Smackdown Zones Order:`)
          .setDescription(zoneText)
          .setColor(0x00ffff)
      );
      break;
    case "/mnm":
    case "!mnm":
      const activityText = events.getMnmActivities();
      msg.channel.send(
        new MessageEmbed()
          .setTitle(`Monday Night Madness Zones for this week:`)
          .setDescription(activityText)
          .setColor(0x00ffff)
      );
      break;
    case "/mnm list":
    case "!mnm list":
      const mnmAllActivityText = events.getMnmActivities({ all: true });
      msg.channel.send(
        new MessageEmbed()
          .setTitle(`MNM Zone Order:`)
          .setDescription(mnmAllActivityText)
          .setColor(0x00ffff)
      );
      break;
    case "/spd":
    case "!spd":
      const spdActivityText = events.getSpdActivities();
      msg.channel.send(
        new MessageEmbed()
          .setTitle(`Next SPD Zone:`)
          .setDescription(spdActivityText)
          .setColor(0x00ffff)
      );
      break;
    case "/spd list":
    case "!spd list":
      const spdAllActivityText = events.getSpdActivities({ all: true });
      msg.channel.send(
        new MessageEmbed()
          .setTitle(`SPD Zone Order:`)
          .setDescription(spdAllActivityText)
          .setColor(0x00ffff)
      );
      break;
    case "/udt":
    case "!udt":
      const udtActivityText = `* We meet up in Wayrest near the Undaunted Enclave. 
            * One person in the group at a time picks up a daily delve quest from Bolgrul and shares it with the group.
            * The group travels to the delve target and completes the quest and returns to Wayrest to turn in the quest.
            * Then the next person in the group, at the direction of the leader, picks up the next quest and the cycle repeats until we've exhausted all of the available quests to the group.`;
      msg.channel.send(
        new MessageEmbed()
          .setTitle(`Undaunted Tuesday Information:`)
          .setDescription(udtActivityText)
          .setColor(0x00ffff)
      );
      break;
    case "/fnf intro":
    case "!fnf intro":
      // Check for officer permissions first
      if (msg.member.roles.cache.some((role) => role.name === "Officers")) {
        const channelToSend = msg.member.voice.channel;
        channelToSend.join().then(
          async (connection) => {
            connection
              .play(fnf_url)
              .on("finish", (end) => channelToSend.leave());
          },
          (err) => {
            channelToSend.leave();
            console.log(err);
          }
        );
      }
      break;
    case "/version":
    case "!version":
      const version = pjson.version;
      const versionText = `VNQBot Version ${version}`;
      msg.channel.send(
        new MessageEmbed()
          .setTitle(`VNQBot`)
          .setDescription(versionText)
          .setColor(0xff00ff)
      );
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

        msg.channel.send(
          new MessageEmbed()
            .setDescription(`${memberName} rolls **${result}** (${min}-${max})`)
            .setColor(0x007dd0)
        );
      }
      if (
        (msg.content.startsWith("!cal ") || msg.content.startsWith("/cal ")) &&
        !isNaN(msg.content.substring(msg.content.indexOf(" ") + 1))
      ) {
        const index = parseInt(
          msg.content.substring(msg.content.indexOf(" ") + 1)
        );
        if (vCalendarData.events.length > index + 1) {
          msg.channel.send(events.getEventAlarm(vCalendarData.events[index]));
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
        msg.channel.send(
          events.getDayEvents(
            addDays(Date.now(), numberOfDays),
            guildName,
            vCalendarData.events
          )
        );
      }
      if (msg.content.startsWith("!ttp") || msg.content.startsWith("/ttp")) {
        if (msg.content.substr(msg.content.indexOf(" ") + 1).length > 3) {
          let groupSizeIndex = msg.content.indexOf("--");
          let groupSize = 4;
          let groupSizeText = null;
          if (msg.content.indexOf("--") > 0) {
            groupSizeText = msg.content.substr(groupSizeIndex + 2);
            if (isNaN(groupSizeText)) {
              msg.channel.send(utils.getErrorMessage(`Invalid group size`));
              return;
            }
            groupSize = Number(groupSizeText);
          }
          const channelName = groupSizeText
            ? msg.content
                .substring(msg.content.indexOf(" ") + 1, groupSizeIndex)
                .trimRight()
            : msg.content.substr(msg.content.indexOf(" ") + 1);
          const channelId = channelUtils.getChannelID(
            channelName,
            msg.client.channels
          );
          if (channelId !== null) {
            const userList = channelUtils.getUserList(channelId, msg.client);
            //msg.channel.send(getUserListText(userList));
            msg.channel.send(
              ttp.getGroupFormationText(
                utils.shuffle(utils.shuffle(userList)),
                channelName,
                groupSize
              )
            );
          } else {
            msg.channel.send("Channel not found");
          }
        } else {
          msg.channel.send(
            utils.getErrorMessage(`Must provide a channel name`)
          );
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
          channel.send(embed);
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
      console.log(`'Posting today's activities`);
      channelTargets.forEach((channelId) => {
        let channel = client.channels.cache.get(channelId);
        channel.send(
          events.getDayEvents(Date.now(), guildName, vCalendarData.events)
        );
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
  return new MessageEmbed()
    .setTitle("Vanquish Bot Commands")
    .setDescription(`All commands are case insensitive`)
    .addField(`!vnqhelp`, `Display this help info about commands.`)
    .addField(
      `!cal *eventIndex*`,
      `Show event *eventIndex* where *eventIndex* is a number from 0 to ${vCalendarData.events.length}.`
    )
    .addField(`!channelinfo`, `View the current channel's ID and name.`)
    .addField(`!mnm`, `Show this week's MNM Zones.`)
    .addField(`!mnm list`, `Show MNM Zone Order.`)
    .addField(`!pledges`, `Show today's pledges.`)
    .addField(
      `!refresh`,
      `Force a reload of events. This happens automatically daily.`
    )
    .addField("!roll", `Roll a random number 1-100.`)
    .addField(
      "!roll *min* *max*",
      `Roll a random number between *min* and *max*. (Ex. !roll 10 20.)`
    )
    .addField(`!sms`, `Show this week's SMS Zones.`)
    .addField(`!sms list`, `Show SMS Zone Order.`)
    .addField(`!spd`, `Show the upcoming SPD Zone.`)
    .addField(`!spd list`, `Show the order of SPD Zones.`)
    .addField(`!today`, `Show today's events.`)
    .addField(`!today+*days*`, `Show events from # days in the future.`)
    .addField(
      `!ttp <*channel name*> [--*groupSize*]`,
      `Form up random groups from the list of users in *channel name*. 
        This is not case sensitive but does respect the whitespace in a name. The default *groupSize* is 4 if none is provided.`
    )
    .addField(`!udt`, `Show Undaunted Tuesday Information.`)
    .addField(`!version`, `Show Bot version info.`)
    .setColor(0x750080);
}

// function getUserListText(userList) {
//     let description = `Channel Members:<br/>`;
//     let users = ``;
//     userList.forEach(item => {
//         users += `${item.name}<br/>`
//     });

//     return new MessageEmbed()
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
//     return new MessageEmbed()
//         .setTitle('Channel List')
//         .setColor(0xFF00FF)
//         .setDescription(turndownService.turndown(channelList));
// }
