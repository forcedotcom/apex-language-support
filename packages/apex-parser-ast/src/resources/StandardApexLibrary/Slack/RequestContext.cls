global class RequestContext {

  global Slack.ActionPayload getActionPayload() {}

  global String getAppId() {}

  global String getChannelId() {}

  global String getEnterpriseId() {}

  global Map<String,Object> getFormData() {}

  global Slack.MessageContext getMessageContext() {}

  global String getTeamId() {}

  global String getTriggerId() {}

  global String getUserId() {}

  global Slack.ViewContext getViewContext() {}

  global Slack.RequestContext.Builder actionPayload(Slack.ActionPayload actionPayload) {}

  global Slack.RequestContext.Builder appId(String appId) {}

  global Slack.RequestContext build() {}

  global Slack.RequestContext.Builder channelId(String channelId) {}

  global Slack.RequestContext.Builder enterpriseId(String enterpriseId) {}

  global Slack.RequestContext.Builder formData(Object> formData) {}

  global Slack.RequestContext.Builder messageContext(Slack.MessageContext messageContext) {}

  global Slack.RequestContext.Builder teamId(String teamId) {}

  global Slack.RequestContext.Builder triggerId(String triggerId) {}

  global Slack.RequestContext.Builder userId(String userId) {}

  global Slack.RequestContext.Builder viewContext(Slack.ViewContext viewContext) {}

}