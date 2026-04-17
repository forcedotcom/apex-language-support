global class Pin {

  global static Slack.PinsAddRequest.Builder builder() {}

  global Slack.PinsAddRequest build() {}

  global Slack.PinsAddRequest.Builder channel(String channel) {}

  global Slack.PinsAddRequest.Builder file(String file) {}

  global Slack.PinsAddRequest.Builder fileComment(String fileComment) {}

  global Slack.PinsAddRequest.Builder timestamp(String timestamp) {}

  global Slack.ErrorResponseMetadata getResponseMetadata() {}

  global void setResponseMetadata(Slack.ErrorResponseMetadata responseMetadata) {}

  global static Slack.PinsListRequest.Builder builder() {}

  global Slack.PinsListRequest build() {}

  global Slack.PinsListRequest.Builder channel(String channel) {}

  global List<Slack.PinsListResponse.MessageItem> getItems() {}

  global void setItems(List<Slack.PinsListResponse.MessageItem> items) {}

  global String getChannel() {}

  global String getCreatedBy() {}

  global Slack.FileComment getComment() {}

  global Slack.File getFile() {}

  global Slack.Message getMessage() {}

  global String getType() {}

  global void setChannel(String channel) {}

  global void setComment(Slack.FileComment comment) {}

  global void setCreated(Integer created) {}

  global void setCreatedBy(String createdBy) {}

  global void setFile(Slack.File file) {}

  global void setMessage(Slack.Message message) {}

  global void setType(String type) {}

  global static Slack.PinsRemoveRequest.Builder builder() {}

  global Slack.PinsRemoveRequest build() {}

  global Slack.PinsRemoveRequest.Builder channel(String channel) {}

  global Slack.PinsRemoveRequest.Builder file(String file) {}

  global Slack.PinsRemoveRequest.Builder fileComment(String fileComment) {}

  global Slack.PinsRemoveRequest.Builder timestamp(String timestamp) {}

}