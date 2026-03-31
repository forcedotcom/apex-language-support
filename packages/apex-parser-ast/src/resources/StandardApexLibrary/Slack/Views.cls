global class Views {

  global String getId() {}

  global String getHash() {}

  global void setParameter(String name, Object value) {}

  global static Slack.ViewsOpenRequest.Builder builder() {}

  global Slack.ViewsOpenRequest build() {}

  global Slack.ViewsOpenRequest.Builder triggerId(String triggerId) {}

  global Slack.ViewsOpenRequest.Builder view(Slack.ModalView view) {}

  global Slack.View getRenderedView() {}

  global Slack.ErrorResponseMetadata getResponseMetadata() {}

  global void setResponseMetadata(Slack.ErrorResponseMetadata responseMetadata) {}

  global static Slack.ViewsPublishRequest.Builder builder() {}

  global Slack.ViewsPublishRequest build() {}

  global Slack.ViewsPublishRequest.Builder hash(String hash) {}

  global Slack.ViewsPublishRequest.Builder userId(String userId) {}

  global Slack.ViewsPublishRequest.Builder view(Slack.HomeView view) {}

  global static Slack.HomeView.Builder builder() {}

  global Slack.HomeView build() {}

  global Slack.HomeView.Builder externalId(String externalId) {}

  global Slack.HomeView.Builder viewReference(Slack.ViewReference viewReference) {}

  global static Slack.ViewsPushRequest.Builder builder() {}

  global Slack.ViewsPushRequest.Builder triggerId(String triggerId) {}

  global Slack.ViewsPushRequest.Builder view(Slack.ModalView view) {}

  global static Slack.ViewsUpdateRequest.Builder builder() {}

  global Slack.ViewsUpdateRequest build() {}

  global Slack.ViewsUpdateRequest.Builder externalId(String externalId) {}

  global Slack.ViewsUpdateRequest.Builder hash(String hash) {}

  global Slack.ViewsUpdateRequest.Builder view(Slack.ModalView view) {}

  global Slack.ViewsUpdateRequest.Builder viewId(String viewId) {}

}