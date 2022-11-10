// exports.play_old = function (channelToSend, music_url) {
//   music_url.forEach((element) => {
//     channelToSend.join().then(
//       async (connection) => {
//         connection.play(element).on("finish", (end) => channelToSend.leave());
//       },
//       (err) => {
//         channelToSend.leave();
//         console.log(err);
//       }
//     );
//   });
// };
// exports.playMulti_brute = function (channelToSend, music_url) {
//   channelToSend.join().then(
//     async (connection) => {
//       connection.play(music_url[0]).on("finish", () => {
//         connection.play(music_url[1]).on("finish", () => channelToSend.leave());
//       });
//     },
//     (err) => {
//       channelToSend.leave();
//       console.log(err);
//     }
//   );
// };

exports.play = function (channelToSend, music_url) {
  channelToSend.join().then(
    async (connection) => {
      playSong(channelToSend, connection, null, music_url, 0);
    },
    (err) => {
      channelToSend.leave();
      console.log(err);
    }
  );
};

function playSong(channelToSend, connection, url, music_url, index) {
  if (index === 0) {
    url = music_url[0];
  }
  const dispatcher = connection.play(url);
  dispatcher.on("finish", (value) => {
    if (!value) {
      index = index + 1 === music_url.length ? 0 : index + 1;
      if (index > 0) {
        playSong(channelToSend, connection, music_url[index], music_url, index);
      } else {
        channelToSend.leave();
      }
    } else {
      channelToSend.leave();
    }
  });
}
