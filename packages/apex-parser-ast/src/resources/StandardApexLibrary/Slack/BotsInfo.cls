global class BotsInfo {

  global String getImage36() {}

  global String getImage48() {}

  global String getImage72() {}

  global void setImage36(String image36) {}

  global void setImage48(String image48) {}

  global void setImage72(String image72) {}

  global String getAppId() {}

  global Slack.BotProfile.Icons getIcons() {}

  global String getId() {}

  global String getName() {}

  global String getTeamId() {}

  global Integer getUpdated() {}

  global Boolean isDeleted() {}

  global void setAppId(String appId) {}

  global void setDeleted(Boolean deleted) {}

  global void setIcons(Slack.BotProfile.Icons icons) {}

  global void setId(String id) {}

  global void setName(String name) {}

  global void setTeamId(String teamId) {}

  global void setUpdated(Integer updated) {}

  global static Slack.BotsInfoRequest.Builder builder() {}

  global Slack.BotsInfoRequest.Builder bot(String bot) {}

  global Slack.BotsInfoRequest build() {}

  global Slack.BotsInfoRequest.Builder teamId(String teamId) {}

  global Slack.BotsInfoResponse.Bot getBot() {}

  global void setBot(Slack.BotsInfoResponse.Bot bot) {}

  global Slack.BotIcons getIcons() {}

  global void setIcons(Slack.BotIcons icons) {}

  global void setUserId(String userId) {}

}