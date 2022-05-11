const { differenceInWeeks, getDay, differenceInDays } = require("date-fns");
const data = require("./data");

module.exports = function () {
  const { MessageEmbed } = require("discord.js");
  const { differenceInMinutes, format, isSameDay } = require("date-fns");
  const TurndownService = require("turndown");
  const bbConvert = require("bbcode-to-markdown");
  const utils = require("./utility");
  const pledgeUtils = require("./pledges");

  const turndownService = new TurndownService();

  this.getEventData = function (guildUrl) {
    return utils.httpGet(`${guildUrl}/events.json`).then((cal) => cal);
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
    const eventObj = this.event_objects.find((row) => row.id === item.event_id);
    const category = this.event_categories.find(
      (row) => row.id === eventObj.event_category_id
    );

    item.eventDate = item.date;
    item.event = eventObj;
    item.event.eventDate = item.eventDate;
    item.event.category = category ? category.name : "None";

    item.link = `${this.guildSite}/events/${item.event_id}?event_instance_id=${item.id}`;
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
            
            ${bbConvert(item.event.description)}`;
    //${turndownService.turndown(item.event.description)}`;

    return new MessageEmbed()
      .setURL(item.link)
      .setTitle(item.event.name)
      .setColor(0x00ffff)
      .setDescription(description ? description.substr(0, 2048) : "");
  };

  this.getDayEvents = (day, guildName, eventItems) => {
    let description = "";
    let pledges = [];
    if (day === undefined) {
      day = new Date(Date.now());
    }

    const todaysEvents = this.getEvents(day, eventItems);

    todaysEvents.forEach((item) => {
      const info = `Event Name/Link: <a href="${item.link}">${
        item.event.name
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

    return new MessageEmbed()
      .setTitle(
        `${guildName} Daily Events - ${format(
          day,
          "MM/dd/yyyy"
        )}\nToday's Activities`
      )
      .addField(pledgeUtils.getPledgeText(), pledges[0])
      .addField(`Tomorrow:`, pledges[1])
      .setColor(0xff00ff)
      .setDescription(turndownService.turndown(description).substr(0, 2047));
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
    const baseDate = new Date("09/12/2021");
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
    const baseDate = new Date("11/8/2021 20:00");
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
      const activityIndex = diff_rot % 13;
      return data.esoData.mnmActivities[activityIndex].name;
    }
  };

  this.getSpdActivities = (options, dlc = false) => {
    const multiplier = dlc
      ? data.esoData.spdDlcZones.length
      : data.esoData.spdZones.length;
    const baseDate = dlc
      ? new Date("05/03/2022 20:00")
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
          ) + `\n`;
      }
      return activityText;
    } else {
      let diff_rot = differenceInWeeks(now, baseDate);
      let periods = Math.ceil(diff_rot / 2);
      return getZones(
        periods,
        multiplier,
        dlc ? data.esoData.spdDlcZones : data.esoData.spdZones
      );
    }
  };
};
