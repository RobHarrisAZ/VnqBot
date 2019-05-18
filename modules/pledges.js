const { differenceInDays } = require('date-fns');
const data = require('./data');

exports.getPledgeText = function () {
    return `Todays Pledges:`
}

exports.getDailyPledges = function(dateTime) {
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
    for (var i = 0; i < data.esoData.pledgeQuestGiver.length; i++){
        var pledge = this.getDungeon(i, diff_rot);
        pledgeText.push("* [" + pledge.name + "](" + pledge.link + ") (by " + data.esoData.pledgeQuestGiver[i] + ")"); 
        pledge = this.getDungeon(i, diff_rot + 1);
        pledgeNext.push(`[${pledge.name}](${pledge.link})`);
    }
        
    //let remainingH = 23 - Math.floor((elapsed % 86400) / 3600);
    //let remainingM = 59 - Math.floor(((elapsed % 86400) / 60) % 60);
    return [pledgeText.join('\n'), pledgeNext.join(', ')];
    //return pledgeText.join('\n').concat('\n_Tomorrow:_\n').concat(pledgeNext.join(", "));
    // + " in " + remainingH + " hours and " + remainingM + " minutes.";
}

exports.getDungeon = function (questGiver, dungeonIndex) {
    dungeonIndex = dungeonIndex % 12;
    return data.esoData.instances[data.esoData.pledges[questGiver].instances[dungeonIndex]];
}