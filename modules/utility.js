const { MessageEmbed } = require('discord.js');
const { differenceInMinutes, isAfter } = require('date-fns');
const fetch = require('node-fetch');

exports.shuffle = function (array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
      
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
      
        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
      
    return array;
}

exports.httpGet = function(uri) {
    return fetch(uri,
        {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            return response.json();
        })
        .catch(err => {
            console.log(err);
        });
}


exports.isFutureDate = function(item) {
    return isAfter(new Date(item.date), Date.now());
}

exports.dateSort = function(item1, item2) {
    if (item1.hasOwnProperty('eventDate')) { 
        if (differenceInMinutes(new Date(item1.eventDate), new Date(item2.eventDate)) > 0) {
            return 1;
        }
        if (differenceInMinutes(new Date(item1.eventDate), new Date(item2.eventDate)) < 0) {
            return -1;
        }
    }
    // else if (item1.start && item2.start) { 
    //     if (item1.start.datetime && item2.start.datetime) {
    //         //const dateString1 = `${item1.date.substr(2, 2)}/${item1.date.substr(0, 2)}/${item1.date.substr(4, 4)}`;
    //         //const dateString2 = `${item2.date.substr(2, 2)}/${item2.date.substr(0, 2)}/${item2.date.substr(4, 4)}`;
    //         if (differenceInDays(new Date(item1.start.datetime), new Date(item2.start.datetime)) >= 0) {
    //             return 1;
    //         }
    //         if (differenceInMinutes(new Date(item1.start.datetime), new Date(item2.start.datetime)) <= 0) {
    //             return -1;
    //         }
    //     }
    // }
      
    return 0;        
}

exports.getErrorMessage = function (message) {
    return new MessageEmbed()
        .setTitle(message)
        .setColor(0xFF0000);
}

exports.padZero = function(value, size) {
    while (value.length < (size || 2)) {
        value = "0" + value;
    }
    return value;
}