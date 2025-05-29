const { differenceInWeeks, getDay, differenceInDays, differenceInMinutes, format, isSameDay } = require("date-fns");
const { TZDate } = require("@date-fns/tz");
const data = require("./data");

module.exports = function () {
  const { EmbedBuilder } = require("discord.js");
  const TurndownService = require("turndown");
  const bbConvert = require("bbcode-to-markdown");
  const utils = require("./utility");
  const pledgeUtils = require("./pledges");

  const turndownService = new TurndownService();

  this.getEventData = function (guildUrl) {
    return utils.httpGet(`${guildUrl}/wp-json/tribe/events/v1/events?page=1&per_page=100`).then((cal) => cal);
  };

  this.getEvents = (day, eventItems) => {
    if (day === undefined) {
      day = Date.now();
    }

    return eventItems
      .filter((item) => {
        const eventDate = new Date(item.eventDate);
        return isSameDay(day, eventDate);
      })
      .sort(utils.dateSort);
  };

  this.processEvents = function (item, index, arr, data) {
    const eventObj = this.events?.find(
      (row) => row.id === item.id
    );
    const category = eventObj.categories.map(c => c.name).join(', ');

    item.eventDate = new TZDate(utils.convertDateToUtc(item.utc_start_date), "America/Los_Angeles");
    item.event = eventObj;
    item.event.eventDate = item.eventDate;
    item.event.category = category ? category : 'None';
    item.event.title = item.event.title.replace(`&#8217;`, `'`);

    item.link = eventObj.url;
    
    processTimezones(item.eventDate, item.event);
  };

  this.getEventAlarm = (item) => {
    if (!item.eventDate) {
      return utils.getErrorMessage("Invalid Event- not scheduled");
    }
    const description = `Start: ${format(
      new Date(item.eventDate),
      "MM/dd/yyyy"
    )}
            PT: ${format(
              new Date().setHours(
                item.event.pst.substr(0, 2),
                item.event.pst.substr(3, 2)
              ),
              "hh:mm a"
            )}
            CT: ${format(
              new Date().setHours(
                item.event.cst.substr(0, 2),
                item.event.cst.substr(3, 2)
              ),
              "hh:mm a"
            )}
            ET: ${format(
              new Date().setHours(
                item.event.est.substr(0, 2),
                item.event.est.substr(3, 2)
              ),
              "hh:mm a"
            )}
            
            ${bbConvert(this.cleanDescription(item.event.description))}`;


    return new EmbedBuilder()
      .setURL(item.event.url)
      .setThumbnail(item.event.image.url)
      .setTitle(item.event.title)
      .setColor(0x00ffff)
      .setDescription(description ? description.substring(0, 2048) : "");
  };

  this.cleanDescription = (description) => {
    const startIndex = description.indexOf('</figure>')+9;
    const endIndex = description.indexOf('tribe-block tribe-block__events-link')-14;
    return description.substr(startIndex, endIndex-startIndex)
      .replace(' @ ', '')
      .replace('<ins>', '')
      .replace('</ins>', '');
  };

  this.getDayEvents = (day, guildName, eventItems) => {
    let description = "No events found for today";
    let pledges = [];
    if (day === undefined) {
      day = new Date(Date.now());
    }

    const todaysEvents = this.getEvents(day, eventItems);
    description = todaysEvents.length > 0 ? "" : description;
    todaysEvents.forEach((item) => {
      const info = `Event Name/Link: <a href="${item.link}">${
        item.event.title
      }</a>
        <br/>PT: ${format(
          new Date().setHours(
            item.event.pst.substr(0, 2),
            item.event.pst.substr(3, 2)
          ),
          "hh:mm a"
        )}
        <br/>CT: ${format(
          new Date().setHours(
            item.event.cst.substr(0, 2),
            item.event.cst.substr(3, 2)
          ),
          "hh:mm a"
        )}
        <br/>ET: ${format(
          new Date().setHours(
            item.event.est.substr(0, 2),
            item.event.est.substr(3, 2)
          ),
          "hh:mm a"
        )}
        <br/><br/>`;
      description = description.concat(info);
    });

    pledges = pledgeUtils.getDailyPledges(day);

    return new EmbedBuilder()
      .setTitle(
        `${guildName} Daily Events - ${format(
          day,
          "MM/dd/yyyy"
        )}\nToday's Activities`
      )
      .addFields({ name: pledgeUtils.getPledgeText(), value: pledges[0] })
      .addFields({ name: `Tomorrow:`, value: pledges[1] })
      .setColor(0xff00ff)
      .setDescription(turndownService.turndown(description).substring(0, 2047));
  };

  this.checkEvents = (channelTargets, eventItems, client) => {
    const now = Date.now();
    const eventList = this.getEvents(now, eventItems);

    return eventList.filter((item) => {
      if (item.eventDate) {
        const eventDate = new Date(item.eventDate);
        diff = differenceInMinutes(eventDate, now);
        return diff >= 40 && diff < 55;
      }
      return false;
    });
  };

  function processTimezones(eventDate, item) {
    let startDateTime = new Date(eventDate);

    const startHour = startDateTime.getHours();
    const startMinutes = utils.padZero(
      startDateTime.getMinutes().toString(),
      2
    );

    item.pst = `${utils.padZero(startHour.toString(), 2)}:${startMinutes}`;
    //item.mst = `${startHour}:${startMinutes}`;
    item.cst = `${utils.padZero(
      (startHour + 2).toString(),
      2
    )}:${startMinutes}`;
    item.est = `${utils.padZero(
      (startHour + 3).toString(),
      2
    )}:${startMinutes}`;
  }

  this.getSmsZones = (options) => {
    const multiplier = data.esoData.smsZones.length;
    const baseDate = new Date("09/26/2021");
    const now = Date.now();
    const hour = new Date(now).getHours();
    const day = getDay(now);

    if (options && options.all) {
      let activityText = ``;
      for (let idx = 0; idx < multiplier; idx++) {
        activityText += getZones(idx, multiplier, data.esoData.smsZones) + `\n`;
      }
      return activityText;
    } else {
      let diff_rot = differenceInWeeks(now, baseDate);
      // If the time is >= 23:00, show the next days pledges.
      if (day === 6 && hour > 10) {
        diff_rot = diff_rot + 1;
      }
      return getZones(diff_rot, multiplier, data.esoData.smsZones);
    }
  };

  getZones = function (zoneIndex, zoneMultiplier, source) {
    zoneIndex = zoneIndex % zoneMultiplier;
    zoneIndex = zoneIndex < 0 ? 0 : zoneIndex;
    return source[zoneIndex].zones.map((zone) => data.esoData.zones[zone].name);
  };

  this.getMnmActivities = (options) => {
    const baseDate = new Date("05/14/2024 20:00");
    const now = Date.now();
    const hour = new Date(now).getHours();
    const day = getDay(now);

    if (options && options.all) {
      let activityText = ``;
      let activities = data.esoData.mnmActivities.map((e) => e.name);
      activities.forEach((a) => (activityText += `${a}\n`));
      return activityText;
    } else {
      let diff_rot = differenceInWeeks(now, baseDate);
      const activityIndex = diff_rot % data.esoData.mnmActivities.length;
      return data.esoData.mnmActivities[activityIndex].name;
    }
  };

  this.getSpdActivities = (options, dlc = false) => {
    const multiplier = dlc
      ? data.esoData.spdDlcZones.length
      : data.esoData.spdZones.length;
    const baseDate = dlc
      ? new Date("05/21/2024 20:00")
      : new Date("04/26/2022 20:00");
    const now = new Date();
    const hour = new Date(now).getHours();
    const day = getDay(now);

    if (options && options.all) {
      let activityText = ``;
      for (let idx = 0; idx < multiplier; idx++) {
        activityText +=
          getZones(
            idx,
            multiplier,
            dlc ? data.esoData.spdDlcZones : data.esoData.spdZones
          )[0] + `\n`;
      }
      return activityText;
    } else {
      let diff_rot = differenceInWeeks(now, baseDate);
      let periods = Math.ceil(diff_rot / 2);
      return getZones(
        periods,
        multiplier,
        dlc ? data.esoData.spdDlcZones : data.esoData.spdZones
      )[0];
    }
  };
};
