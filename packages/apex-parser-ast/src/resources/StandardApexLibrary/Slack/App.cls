global class App {

  global String getAppKey() {}

  global Slack.AppClient getAppClient() {}

  global Slack.BotClient getBotClientForTeam(String teamId) {}

  global Slack.UserClient getUserClientForTeam(String teamId, String slackUserId) {}

  global String getConnectedSalesforceUserId(String teamId, String slackUserId) {}

  global Map<String, String> getConnectedSalesforceUserIdMap(String teamId, List<String> slackUserIds) {}

  global String getConnectedSlackUserId(String teamId, String salesforceUserId) {}

  global Map<String, String> getConnectedSlackUserIdMap(String teamId, List<String> salesforceUserIds) {}

}