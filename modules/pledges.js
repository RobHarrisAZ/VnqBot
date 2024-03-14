const { differenceInDays } = require("date-fns");
const data = require("./data");

exports.getPledgeText = function () {
  return `Todays Pledges:`;
};

exports.getDailyPledges = function (dateTime) {
  // const resetTime = '11:00pm';
  // const resetZone = 'America/Los_Angeles';
  // let elapsed = time - baseTimestamp;
  // Math.floor(elapsed / 86400);
  const hour = new Date(dateTime).getHours();

  const baseDate = new Date("03/12/2024 23:00"); //new Date("08/21/2022 23:00");
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
  for (var npc = 0; npc < data.esoData.pledgeQuestGiver.length; npc++) {
    var pledge =
      //npc === 2
      //? this.getDungeon(npc, diff_rot, getDungeonCount(npc)) :
      this.getDungeon(npc, diff_rot, getDungeonCount(npc));
    pledgeText.push(
      `* [${pledge.name}](${pledge.link}) (by ${data.esoData.pledgeQuestGiver[npc]})`
    );
    pledge =
      //npc == 2
      //  ? this.getDungeon(npc, diff_rot + 1, getDungeonCount(npc)) :
      this.getDungeon(npc, diff_rot + 1, getDungeonCount(npc));
    pledgeNext.push(`[${pledge.name}](${pledge.link})`);
  }

  return [pledgeText.join("\n"), pledgeNext.join(", ")];
};

exports.getDungeon = function (questGiver, dungeonIndex, dungeonMultiplier) {
  dungeonIndex = dungeonIndex % dungeonMultiplier;
  return data.esoData.instances[
    data.esoData.pledges[questGiver].instances[dungeonIndex]
  ];
};

getDungeonCount = (questGiver) =>
  data.esoData.pledges[questGiver].instances.length;
// exports.getDlcDungeon = function (questGiver, dungeonIndex) {
//     dungeonIndex = dungeonIndex % 14;
//     return data.esoData.instances[data.esoData.pledges[questGiver].instances[dungeonIndex]];
// }
