const { differenceInDays } = require('date-fns');
const data = require('./data');

exports.getPledgeText = function () {
    return `Todays Pledges:`
}

exports.getDailyPledges = function(dateTime) {
    // const resetTime = '11:00pm';
    // const resetZone = 'America/Los_Angeles';
    // let elapsed = time - baseTimestamp;
    // Math.floor(elapsed / 86400);
    const hour = new Date(dateTime).getHours();

    const baseDate = new Date('08/23/2020 23:00');
    if (!dateTime) {
        dateTime = Date.now();
    }

    let diff_rot = differenceInDays(dateTime, baseDate);
    // If the time is >= 23:00, show the next days pledges.
    // if (hour > 22) {
    //     diff_rot = diff_rot + 1;
    // }

    pledgeText = [];
    pledgeNext = [];
    for (var i = 0; i < data.esoData.pledgeQuestGiver.length; i++){
        var pledge = i === 2 ? this.getDungeon(i, diff_rot, 18) : this.getDungeon(i, diff_rot, 12);
        pledgeText.push("* [" + pledge.name + "](" + pledge.link + ") (by " + data.esoData.pledgeQuestGiver[i] + ")"); 
        pledge = i == 2 ? this.getDungeon(i, diff_rot + 1, 18) : this.getDungeon(i, diff_rot + 1, 12);
        pledgeNext.push(`[${pledge.name}](${pledge.link})`);
    }
        
    return [pledgeText.join('\n'), pledgeNext.join(', ')];
}

exports.getDungeon = function (questGiver, dungeonIndex, dungeonMultiplier) {
    dungeonIndex = dungeonIndex % dungeonMultiplier;
    return data.esoData.instances[data.esoData.pledges[questGiver].instances[dungeonIndex]];
}
// exports.getDlcDungeon = function (questGiver, dungeonIndex) {
//     dungeonIndex = dungeonIndex % 14;
//     return data.esoData.instances[data.esoData.pledges[questGiver].instances[dungeonIndex]];
// }