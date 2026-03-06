global class Auth {

  global static Slack.AuthRevokeRequest.Builder builder() {}

  global Slack.AuthRevokeRequest build() {}

  global Slack.AuthRevokeRequest.Builder test(Boolean test) {}

  global Boolean isRevoked() {}

  global void setRevoked(Boolean revoked) {}

  global static Slack.AuthTeamsListRequest.Builder builder() {}

  global Slack.AuthTeamsListRequest build() {}

  global Slack.AuthTeamsListRequest.Builder cursor(String cursor) {}

  global Slack.AuthTeamsListRequest.Builder includeIcon(Boolean includeIcon) {}

  global Slack.AuthTeamsListRequest.Builder cursor(String cursor) {}

  global Slack.AuthTeamsListRequest.Builder limitValue(Integer limitValue) {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global List<Slack.AuthTeamsListResponse.Team> getTeams() {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global void setTeams(List<Slack.AuthTeamsListResponse.Team> teams) {}

  global String getId() {}

  global String getName() {}

  global void setId(String id) {}

  global void setName(String name) {}

  global static Slack.AuthTestRequest.Builder builder() {}

  global Slack.AuthTestRequest build() {}

  global String getAppId() {}

  global String getAppName() {}

  global String getBotId() {}

  global String getEnterpriseId() {}

  global String getTeam() {}

  global String getTeamId() {}

  global String getUrl() {}

  global String getUser() {}

  global String getUserId() {}

  global Boolean isEnterpriseInstall() {}

  global void setAppId(String appId) {}

  global void setAppName(String appName) {}

  global void setBotId(String botId) {}

  global void setEnterpriseId(String enterpriseId) {}

  global void setEnterpriseInstall(Boolean isEnterpriseInstall) {}

  global void setTeam(String team) {}

  global void setTeamId(String teamId) {}

  global void setUrl(String url) {}

  global void setUser(String user) {}

  global void setUserId(String userId) {}

}