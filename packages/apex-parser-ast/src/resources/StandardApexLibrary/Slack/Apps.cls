global class Apps {

  global static Slack.AppsEventAuthorizationsListRequest.Builder builder() {}

  global Slack.AppsEventAuthorizationsListRequest build() {}

  global Slack.AppsEventAuthorizationsListRequest.Builder cursor(String cursor) {}

  global Slack.AppsEventAuthorizationsListRequest.Builder eventContext(String eventContext) {}

  global Slack.AppsEventAuthorizationsListRequest.Builder limitValue(Integer limitValue) {}

  global List<Slack.AppsEventAuthorizationsListResponse.Authorization> getAuthorizations() {}

  global String getCursorNext() {}

  global void setAuthorizations(List<Slack.AppsEventAuthorizationsListResponse.Authorization> authorizations) {}

  global void setCursorNext(String cursorNext) {}

  global String getEnterpriseId() {}

  global Boolean getIsBot() {}

  global Boolean getIsEnterpriseInstall() {}

  global String getTeamId() {}

  global String getUserId() {}

  global void setEnterpriseId(String enterpriseId) {}

  global void setIsBot(Boolean isBot) {}

  global void setIsEnterpriseInstall(Boolean isEnterpriseInstall) {}

  global void setTeamId(String teamId) {}

  global void setUserId(String userId) {}

  global static Slack.AppsUninstallRequest.Builder builder() {}

  global Slack.AppsUninstallRequest build() {}

  global Slack.AppsUninstallRequest.Builder clientId(String clientId) {}

  global Slack.AppsUninstallRequest.Builder clientSecret(String clientSecret) {}

}