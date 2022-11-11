const { getHours } = require("date-fns");

module.exports = function () {
  const TurndownService = require("turndown");
  const turndownService = new TurndownService();
  const { EmbedBuilder } = require("discord.js");
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
      let message = new EmbedBuilder();
      let appMessage = `<a href="${guildUrl}/site_applications/${app.site_application.id}">${app.site_application.name}</a>`;
      message.addFields({
        name: `Name: `,
        value: turndownService.turndown(appMessage).substring(0, 255),
        inline: true,
      });
      let nameQuestion = app.site_application_fields.find(
        (q) =>
          q.question ===
          "Please list your @name. This will be used for your guild invite if/when you are application is accepted.  (Your @name IS your UserID seen in the example image below.)"
      );
      nameQuestion = nameQuestion || { answer: "N/A" };
      message.addFields({
        name: `@Name: `,
        value: turndownService.turndown(nameQuestion.answer).substr(0, 255),
        inline: true,
      });
      message.setTitle(`New Application received`).setColor(0xff00ff);
      message;
      return message;
    });
  };

  this.formatApplicationDetails = async (openApps, guildUrl) => {
    let message = new EmbedBuilder();
    return openApps.forEach((app) => {
      this.getApplication(guildUrl, app.id).then((appDetail) => {
        app.application_details = appDetail;

        const nameQuestion =
          app.application_details.site_application_fields.find(
            (q) =>
              q.question ===
              "Please list your @name. This will be used for your guild invite if/when you are application is accepted. (Your @name IS your UserID seen in the example image below.)"
          );
        message.setTitle(`Open Applications`);
        message.addFields({
          name: `Name:`,
          value: turndownService
            .turndown(
              `<a href="${guildUrl}/site_applications/${app.application_details.site_application.id}">${app.application_details.site_application.name}</a>`
            )
            .substring(0, 1024),
          inline: true,
        });
        message.addFields({
          name: `Main/@Name`,
          value: turndownService
            .turndown("```" + nameQuestion.answer + "```")
            .substring(0, 1024),
          inline: true,
        });
        message.addFields({
          name: `━━━━━━━━━━━━⊱⋆⊰━━━━━━━━━━━━`,
          value: "◙",
          inline: false,
        });
      });
    });
  };

  this.authenticateSite = async (guildUrl, user, pass) => {
    const payload = `{"user":{"email":"${user}","password":"${pass}"}}`;
    const url = `${guildUrl}/users/sign_in.json`;
    const response = await utils.httpPost(url, payload);
    return response.user_session.authentication_token;
  };
};
