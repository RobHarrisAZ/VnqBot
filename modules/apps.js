const utils = require("./utility");

module.exports = function () {
  this.getApplications = (guildUrl) =>
    utils.httpFetch(`${guildUrl}/site_applications.json`);

  this.getApplication = (guildUrl, appId) =>
    utils.httpGet(`${guildUrl}/site_applications/${appId}.json`);

  this.processOpenApplications = (guildUrl) =>
    this.getApplications(guildUrl).then((apps) =>
      apps.site_applications.filter((app) => app.status === "open")
    );

  this.formatApplication = (app) => {
    const title = `New Application from: ${app.name}<br>`;
    let appMessage = "";
    app.site_application_fields.array.forEach((question) => {
      appMessage += `<b>${question.question}</b><br><span>${question.answer}</span>`;
    });
  };
};
