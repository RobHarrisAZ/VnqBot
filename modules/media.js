const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  createAudioResource,
  createAudioPlayer,
  //  generateDependencyReport,
} = require("@discordjs/voice");
fs = require("fs");

exports.play = function (channelToSend, music_url) {
  //console.log(generateDependencyReport());
  const player = createAudioPlayer();
  const connection = joinVoiceChannel({
    channelId: channelToSend.id,
    guildId: channelToSend.guild.id,
    adapterCreator: channelToSend.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });
  let sub;
  connection.on(
    VoiceConnectionStatus.Ready,
    () => {
      sub = connection.subscribe(player);
      playSong(sub, player, connection, null, music_url, 0);
    },
    (err) => {
      sub.unsubscribe();
      connection.destroy();
      console.log(err);
    }
  );
  connection.on(VoiceConnectionStatus.Destroyed, () => {
    console.log("Cleaning up..");
    player.stop();
  });
};

function playSong(sub, player, connection, url, music_url, index) {
  if (index === 0) {
    url = music_url[0];
  }
  const song = createAudioResource(fs.createReadStream(url));
  player.play(song);
  player.on(AudioPlayerStatus.Playing, () => {
    console.log(`Playing audio...`);
  });
  player.on(AudioPlayerStatus.Idle, () => {
    index = index + 1 === music_url.length ? 0 : index + 1;
    if (index > 0) {
      playSong(sub, player, connection, music_url[index], music_url, index);
    } else {
      sub.unsubscribe();
      connection.destroy();
    }
  });
}
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
