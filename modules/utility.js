const { EmbedBuilder } = require("discord.js");
const { differenceInMinutes, isAfter } = require("date-fns");
const fetch = require("node-fetch");
const { HttpResponseError } = require("./HttpResponseError");

exports.shuffle = function (array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

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
};

exports.httpGet = function (uri) {
  return fetch(uri, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => {
      console.log(err);
    });
};
//      "User-Agent": "VnqBot",
exports.httpFetch = async function (uri) {
  const response = await fetch(uri, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "vnqbot",
    },
  });
  return await response.json();
  // .then((response) => {
  //   return response.json();
  // })
  // .catch((err) => {
  //   console.log(err);
  // });
};

exports.httpPost = async (uri, payload) => {
  const response = await fetch(uri, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: payload,
  });
  try {
    checkStatus(response);
    return await response.json();
  } catch (error) {
    console.error(error);

    const errorBody = await error.response.text();
    console.error(`Error body: ${errorBody}`);
  }
};

checkStatus = (response) => {
  if (response.ok) {
    return response;
  } else {
    throw new HttpResponseError(response);
  }
};

exports.isFutureDate = function (item) {
  return isAfter(new Date(item.date), Date.now());
};

exports.dateSort = function (item1, item2) {
  if (item1.hasOwnProperty("eventDate")) {
    if (
      differenceInMinutes(
        new Date(item1.eventDate),
        new Date(item2.eventDate)
      ) > 0
    ) {
      return 1;
    }
    if (
      differenceInMinutes(
        new Date(item1.eventDate),
        new Date(item2.eventDate)
      ) < 0
    ) {
      return -1;
    }
  }

  return 0;
};

exports.getErrorMessage = function (message) {
  return new EmbedBuilder().setTitle(message).setColor(0xff0000);
};

exports.padZero = function (value, size) {
  while (value.length < (size || 2)) {
    value = "0" + value;
  }
  return value;
};

exports.getRandomInteger = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
};
