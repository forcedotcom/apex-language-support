global class UserMappingService {

  global UserMappingService() {}

  global String getSalesforceUserId(String slackUserId) {}

  global Map<String, String> getSalesforceUserIdMap(List<String> slackUserIds) {}

  global String getSlackUserId(String salesforceUserId, String teamId) {}

  global Map<String, String> getSlackUserIdMap(List<String> salesforceUserIds, String teamId) {}

  global Object clone() {}

}
