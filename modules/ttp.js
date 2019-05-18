const { RichEmbed } = require('discord.js');

exports.getGroupFormationText = function(userList, channelName) {
    let fields = [];
    let groupId = 0;
    for (let index = 0; index < userList.length; index++) {
        groupId = ((index % 4) === 0) ? groupId+1 : groupId;
        userList[index].groupId = groupId;
    }
    const groupCount = Math.ceil(userList.length / 4);
    for (let groupIndex = 1; groupIndex <= groupCount; groupIndex++) {
        let members = userList.filter(item => item.groupId === groupIndex);
        let userCount = members.length;
        let userText = ``;
        members.forEach(user => userText += `${user.name}, `);
        userText = userText.substr(0, userText.length - 2);
        fields.push({ name: `Group ${groupIndex} (${userCount}):`, value: `${ userText }`});
    }
    return new RichEmbed({ fields: fields })
        .setTitle(`Vanquish Group Formation - ${channelName}`)
        .setColor(0x007780);
}