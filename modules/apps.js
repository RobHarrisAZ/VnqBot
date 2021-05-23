module.exports = function () {
  const TurndownService = require("turndown");
  const turndownService = new TurndownService();
  const { MessageEmbed } = require("discord.js");
  const utils = require("./utility");

  this.loginToken = null;

  this.getApplications = async (guildUrl) => {
    if (!this.loginToken) {
      this.loginToken = await this.authenticateSite(
        guildUrl,
        process.env.AUTHU,
        process.env.AUTHP
      );
    }

    return utils.httpFetch(
      `${guildUrl}/site_applications.json?auth_token=${this.loginToken}`
    );
  };

  this.getApplication = async (guildUrl, appId) => {
    if (!this.loginToken) {
      this.loginToken = await this.authenticateSite(
        guildUrl,
        process.env.AUTHU,
        process.env.AUTHP
      );
    }
    return utils.httpFetch(
      `${guildUrl}/site_applications/${appId}.json?auth_token=${this.loginToken}`
    );
  };

  this.processOpenApplications = async (guildUrl) => {
    if (!this.loginToken) {
      this.loginToken = await this.authenticateSite(
        guildUrl,
        process.env.AUTHU,
        process.env.AUTHP
      );
    }
    return this.getApplications(guildUrl).then((apps) =>
      apps.site_applications.filter((app) => app.status === "open")
    );
  };

  this.formatApplication = async (appId, guildUrl) => {
    return this.getApplication(guildUrl, appId).then((app) => {
      let message = new MessageEmbed();
      let appMessage = `<a href="${guildUrl}/site_applications/${app.site_application.id}">${app.site_application.name}</a>`;
      message.addField(
        `Name `,
        turndownService.turndown(appMessage).substr(0, 255),
        false
      );
      const nameQuestion = app.site_application_fields.find(
        (q) =>
          q.question ===
          "Thank you for applying to Vanquish, please list the MAIN character you are applying to the guild with, your preferred role and your @Name"
      );
      message.addField(
        `Main Character & @Name`,
        turndownService.turndown(nameQuestion.answer).substr(0, 255),
        false
      );
      // app.site_application_fields.forEach((question) => {
      //   if (
      //     question.question !== "Race and Class" &&
      //     question.question !== "Main Character" &&
      //     question.question !== "Email" &&
      //     question.question !== "Your Name"
      //   ) {
      //     //appMessage +=
      //     message.addField(
      //       turndownService.turndown(question.question).substr(0, 255),
      //       turndownService.turndown(question.answer).substr(0, 255),
      //       false
      //     );
      //   }
      // });
      message.setTitle(`New Application received`).setColor(0xff00ff);

      return message;
    });
  };

  this.authenticateSite = async (guildUrl, user, pass) => {
    const payload = `{"user":{"email":"${user}","password":"${pass}"}}`;
    const url = `${guildUrl}/users/sign_in.json`;
    const response = await utils.httpPost(url, payload);
    return response.user_session.authentication_token;
  };
};
