global class Chat {

  global static Slack.ChatDeleteRequest.Builder builder() {}

  global String getChannel() {}

  global String getDeprecatedArgument() {}

  global String getTs() {}

  global void setChannel(String channel) {}

  global void setDeprecatedArgument(String deprecatedArgument) {}

  global void setTs(String ts) {}

  global static Slack.ChatDeleteScheduledMessageRequest.Builder builder() {}

  global Slack.ChatDeleteScheduledMessageRequest build() {}

  global Slack.ChatDeleteScheduledMessageRequest.Builder channel(String channel) {}

  global Slack.ChatDeleteScheduledMessageRequest.Builder scheduledMessageId(String scheduledMessageId) {}

  global static Slack.ChatGetPermalinkRequest.Builder builder() {}

  global Slack.ChatGetPermalinkRequest build() {}

  global Slack.ChatGetPermalinkRequest.Builder channel(String channel) {}

  global Slack.ChatGetPermalinkRequest.Builder messageTs(String messageTs) {}

  global String getPermalink() {}

  global void setPermalink(String permalink) {}

  global static Slack.ChatMeMessageRequest.Builder builder() {}

  global Slack.ChatMeMessageRequest build() {}

  global Slack.ChatMeMessageRequest.Builder channel(String channel) {}

  global Slack.ChatMeMessageRequest.Builder text(String text) {}

  global static Slack.ChatPostEphemeralRequest.Builder builder() {}

  global Slack.ChatPostEphemeralRequest.Builder attachmentsAsString(String attachmentsAsString) {}

  global Slack.ChatPostEphemeralRequest build() {}

  global Slack.ChatPostEphemeralRequest.Builder channel(String channel) {}

  global Slack.ChatPostEphemeralRequest.Builder iconEmoji(String iconEmoji) {}

  global Slack.ChatPostEphemeralRequest.Builder iconUrl(String iconUrl) {}

  global Slack.ChatPostEphemeralRequest.Builder linkNames(Boolean linkNames) {}

  global Slack.ChatPostEphemeralRequest.Builder parse(String parse) {}

  global Slack.ChatPostEphemeralRequest.Builder text(String text) {}

  global Slack.ChatPostEphemeralRequest.Builder threadTs(String threadTs) {}

  global Slack.ChatPostEphemeralRequest.Builder user(String user) {}

  global Slack.ChatPostEphemeralRequest.Builder username(String username) {}

  global Slack.ChatPostEphemeralRequest.Builder viewReference(Slack.ViewReference viewReference) {}

  global String getMessageTs() {}

  global void setMessageTs(String messageTs) {}

  global static Slack.ChatPostMessageRequest.Builder builder() {}

  global Slack.ChatPostMessageRequest.Builder attachmentsAsString(String attachmentsAsString) {}

  global Slack.ChatPostMessageRequest build() {}

  global Slack.ChatPostMessageRequest.Builder channel(String channel) {}

  global Slack.ChatPostMessageRequest.Builder iconEmoji(String iconEmoji) {}

  global Slack.ChatPostMessageRequest.Builder linkNames(Boolean linkNames) {}

  global Slack.ChatPostMessageRequest.Builder mrkdwn(Boolean mrkdwn) {}

  global Slack.ChatPostMessageRequest.Builder parse(String parse) {}

  global Slack.ChatPostMessageRequest.Builder replyBroadcast(Boolean replyBroadcast) {}

  global Slack.ChatPostMessageRequest.Builder text(String text) {}

  global Slack.ChatPostMessageRequest.Builder threadTs(String threadTs) {}

  global Slack.ChatPostMessageRequest.Builder unfurlLinks(Boolean unfurlLinks) {}

  global Slack.ChatPostMessageRequest.Builder unfurlMedia(Boolean unfurlMedia) {}

  global Slack.ChatPostMessageRequest.Builder username(String username) {}

  global Slack.ChatPostMessageRequest.Builder viewReference(Slack.ViewReference viewReference) {}

  global Slack.Message getMessage() {}

  global Slack.ErrorResponseMetadata getResponseMetadata() {}

  global void setMessage(Slack.Message message) {}

  global void setResponseMetadata(Slack.ErrorResponseMetadata responseMetadata) {}

  global static Slack.ChatScheduledMessagesListRequest.Builder builder() {}

  global Slack.ChatScheduledMessagesListRequest build() {}

  global Slack.ChatScheduledMessagesListRequest.Builder channel(String channel) {}

  global Slack.ChatScheduledMessagesListRequest.Builder cursor(String cursor) {}

  global Slack.ChatScheduledMessagesListRequest.Builder latest(String latest) {}

  global Slack.ChatScheduledMessagesListRequest.Builder limitValue(Integer limitValue) {}

  global Slack.ChatScheduledMessagesListRequest.Builder oldest(String oldest) {}

  global Slack.ChatScheduledMessagesListRequest.Builder teamId(String teamId) {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global List<Slack.ChatScheduledMessagesListResponse.ScheduledMessage> getScheduledMessages() {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global void setScheduledMessages(List<Slack.ChatScheduledMessagesListResponse.ScheduledMessage> scheduledMessages) {}

  global String getChannelId() {}

  global Integer getDateCreated() {}

  global String getId() {}

  global Integer getPostAt() {}

  global String getText() {}

  global void setChannelId(String channelId) {}

  global void setDateCreated(Integer dateCreated) {}

  global void setId(String id) {}

  global void setPostAt(Integer postAt) {}

  global void setText(String text) {}

  global static Slack.ChatScheduleMessageRequest.Builder builder() {}

  global Slack.ChatScheduleMessageRequest.Builder attachmentsAsString(String attachmentsAsString) {}

  global Slack.ChatScheduleMessageRequest build() {}

  global Slack.ChatScheduleMessageRequest.Builder channel(String channel) {}

  global Slack.ChatScheduleMessageRequest.Builder linkNames(Boolean linkNames) {}

  global Slack.ChatScheduleMessageRequest.Builder parse(String parse) {}

  global Slack.ChatScheduleMessageRequest.Builder setPostAt(Integer postAt) {}

  global Slack.ChatScheduleMessageRequest.Builder replyBroadcast(Boolean replyBroadcast) {}

  global Slack.ChatScheduleMessageRequest.Builder text(String text) {}

  global Slack.ChatScheduleMessageRequest.Builder threadTs(String threadTs) {}

  global Slack.ChatScheduleMessageRequest.Builder unfurlLinks(Boolean unfurlLinks) {}

  global Slack.ChatScheduleMessageRequest.Builder unfurlMedia(Boolean unfurlMedia) {}

  global Slack.ChatScheduleMessageRequest.Builder viewReference(Slack.ViewReference viewReference) {}

  global Slack.ChatScheduleMessageResponse.ScheduledMessage getMessage() {}

  global String getScheduledMessageId() {}

  global void setMessage(Slack.ChatScheduleMessageResponse.ScheduledMessage message) {}

  global void postAt(Integer postAt) {}

  global void setScheduledMessageId(String scheduledMessageId) {}

  global String getBotId() {}

  global Slack.BotProfile getBotProfile() {}

  global String getTeam() {}

  global String getType() {}

  global String getUser() {}

  global void setBotId(String botId) {}

  global void setBotProfile(Slack.BotProfile botProfile) {}

  global void setTeam(String team) {}

  global void setType(String type) {}

  global void setUser(String user) {}

  global static Slack.ChatUpdateRequest.Builder builder() {}

  global Slack.ChatUpdateRequest.Builder attachmentsAsString(String attachmentsAsString) {}

  global Slack.ChatUpdateRequest build() {}

  global Slack.ChatUpdateRequest.Builder channel(String channel) {}

  global Slack.ChatUpdateRequest.Builder linkNames(Boolean linkNames) {}

  global Slack.ChatUpdateRequest.Builder parse(String parse) {}

  global Slack.ChatUpdateRequest.Builder text(String text) {}

  global Slack.ChatUpdateRequest.Builder ts(String ts) {}

  global Slack.ChatUpdateRequest.Builder viewReference(Slack.ViewReference viewReference) {}

  global string getText() {}

}