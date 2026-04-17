global class UserMapping Service {

  global String getSalesforceUserId(String slackUserId) {}

  global Map<String, String> getSalesforceUserIdMap(List<String> slackUserIds) {}

  global String getSlackUserId(String salesforceUserId, String teamId) {}

  global Map<String, String> getSlackUserIdMap(List<String> salesforceUserIds, String teamId) {}

}