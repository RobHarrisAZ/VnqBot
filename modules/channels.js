exports.getChannel = function(channelId, client) {
    return client.channels.get(channelId)
}

exports.getChannelID = function(channelName, channels) {
    const channel = channels.find(val => val.name.toUpperCase() === channelName.toUpperCase());
    return channel ? channel.id : null;
}

exports.getUserList = function(channelId, client) {
    const channel = this.getChannel(channelId, client);
    let users = channel.members.entries();
    let userList = [];
    while (true) {
        let user = users.next();
        if (user.value) {
            let id = user.value[0];
            let member = user.value[1];
            let userItem = {
                id: id,
                name: member.displayName
            };
            userList.push(userItem);
        } else {
            break;
        }
    }
     
    return userList;
}