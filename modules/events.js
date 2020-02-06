module.exports = function () {
    const { RichEmbed } = require('discord.js');
    const { differenceInMinutes, format, isSameDay, isAfter } = require('date-fns');
    const TurndownService = require('turndown');
    const bbConvert = require('bbcode-to-markdown');
    const utils = require('./utility');
    const pledgeUtils = require('./pledges');

    const turndownService = new TurndownService();

    this.getEventData = function (guildUrl) {
        return utils.httpGet(`${guildUrl}/events.json`)
            .then(cal => cal);
    }

    this.getEvents = (day, eventItems) => {
        if (day === undefined) {
            day = Date.now();
        }
    
        return eventItems.filter(item => {
            const eventDate = new Date(item.eventDate);
            return isSameDay(day, eventDate) && item.event.name.indexOf(`Ska'vyn`) === -1;
        }).sort(utils.dateSort);
    }

    this.processEvents = function (item, index, arr, data) {
        const eventObj = this.event_objects.find((row) => row.id === item.event_id);
        const category = this.event_categories.find((row) => row.id === eventObj.event_category_id);

        item.eventDate = item.date;
        item.event = eventObj;
        item.event.eventDate = item.eventDate;
        item.event.category = category ? category.name : 'None';

        item.link = `${this.guildSite}/events/${item.event_id}?event_instance_id=${item.id}`;
        processTimezones(item.eventDate, item.event);
    }

    this.getEventAlarm = (item) => {
        if (!item.eventDate) {
            return utils.getErrorMessage('Invalid Event- not scheduled');
        }
        const description = turndownService.turndown(
            `Start: ${format(new Date(item.eventDate), 'MM/dd/yyyy')}
            <br/>PT: ${format(new Date().setHours(item.event.pst.substr(0, 2), item.event.pst.substr(3, 2)), 'hh:mm a')}
            <br/>CT: ${format(new Date().setHours(item.event.cst.substr(0, 2), item.event.cst.substr(3, 2)), 'hh:mm a')}
            <br/>ET: ${format(new Date().setHours(item.event.est.substr(0, 2), item.event.est.substr(3, 2)), 'hh:mm a')}
            <br/><br/>${bbConvert(item.event.description)}`);
        return new RichEmbed()
            .setURL(item.link)
            .setTitle(item.event.name)
            .setColor(0x00FFFF)
            .setDescription(description ? description.substr(0, 2048) : '');
    }

    this.getDayEvents = (day, guildName, eventItems) => {
        let description = '';
        let pledges = [];
        if (day === undefined) {
            day = new Date(Date.now());
        }

        const todaysEvents = this.getEvents(day, eventItems);

        todaysEvents.forEach(item => {
            const info = `Event Name/Link: <a href="${item.link}">${item.event.name}</a>
        <br/>PT: ${format(new Date().setHours(item.event.pst.substr(0, 2), item.event.pst.substr(3, 2)), 'hh:mm a')}
        <br/>CT: ${format(new Date().setHours(item.event.cst.substr(0, 2), item.event.cst.substr(3, 2)), 'hh:mm a')}
        <br/>ET: ${format(new Date().setHours(item.event.est.substr(0, 2), item.event.est.substr(3, 2)), 'hh:mm a')}
        <br/><br/>`;
            description = description.concat(info);
        });

        pledges = pledgeUtils.getDailyPledges(day);

        return new RichEmbed()
            .setTitle(`${guildName} Daily Events - ${format(day, 'MM/dd/yyyy')}\nToday's Activities`)
            .addField(pledgeUtils.getPledgeText(), pledges[0])
            .addField(`Tomorrow:`, pledges[1])
            .setColor(0xFF00FF)
            .setDescription(turndownService.turndown(description).substr(0, 2047));
    }

    this.checkEvents = (channelTargets, eventItems, client) => {
        const now = Date.now();
        const eventList = this.getEvents(now, eventItems);

        return eventList.filter(item => {
            if (item.eventDate) {
                const eventDate = new Date(item.eventDate);
                diff = differenceInMinutes(eventDate, now);
                return diff >= 40 && diff < 55;
            }
            return false;
        });
    }

    function processTimezones(eventDate, item) {
        let startDateTime = new Date(eventDate);
    
        const startHour = startDateTime.getHours();
        const startMinutes = utils.padZero(startDateTime.getMinutes().toString(), 2);

        item.pst = `${utils.padZero(startHour.toString(), 2)}:${startMinutes}`;
        //item.mst = `${startHour}:${startMinutes}`;
        item.cst = `${utils.padZero((startHour + 2).toString(), 2)}:${startMinutes}`;
        item.est = `${utils.padZero((startHour + 3).toString(), 2)}:${startMinutes}`;
    }
}