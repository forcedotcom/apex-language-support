/**
 * Access information about mentions. A mention is an “@” character followed by a user or group name. When a user or group is mentioned, they receive a notification.
 */
global class Mentions {

  global Mentions() {}

  global static ConnectApi.MentionCompletionPage getMentionCompletions(String communityId, String q, String contextId) {}

  global static ConnectApi.Mentions getMentionCompletions(String communityId, String q, String contextId, ConnectApi.MentionCompletionType type, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.Mentions getMentionValidations(String communityId, String parentId, List<String> recordIds, ConnectApi.FeedItemVisibilityType visibility) {}

  global static void setTestGetMentionCompletions(String communityId, String q, String contextId, ConnectApi.MentionCompletionPage result) {}

  global static void setTestGetMentionCompletions(String communityId, String q, String contextId, ConnectApi.MentionCompletionType type, Integer pageParam, Integer pageSize, ConnectApi.MentionCompletionPage result) {}

  global Object clone() {}

}