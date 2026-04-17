global class MigrationExchange {

  global static Slack.MigrationExchangeRequest.Builder builder() {}

  global Slack.MigrationExchangeRequest build() {}

  global Slack.MigrationExchangeRequest.Builder teamId(String teamId) {}

  global Slack.MigrationExchangeRequest.Builder toOld(Boolean toOld) {}

  global Slack.MigrationExchangeRequest.Builder users(List<String> users) {}

  global String getEnterpriseId() {}

  global List<String> getInvalidUserIds() {}

  global String getTeamId() {}

}