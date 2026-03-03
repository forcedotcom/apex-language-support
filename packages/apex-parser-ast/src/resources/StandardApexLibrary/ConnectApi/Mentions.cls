/**
 * Access information about mentions. A mention is an “@” character followed by a user or group name. When a user or group is mentioned, they receive a notification.
 */
global class Mentions {

  public static ConnectApi.MentionCompletionPage getMentionCompletions(String communityId, String q, String contextId) {}

  public static ConnectApi.Mentions getMentionCompletions(String communityId, String q, String contextId, ConnectApi.MentionCompletionType type, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.Mentions getMentionValidations(String communityId, String parentId, List< String > recordIds, ConnectApi.FeedItemVisibilityType visibility) {}

  public static void setTestGetMentionCompletions(String communityId, String q, String contextId, ConnectApi.MentionCompletionPage result) {}

  public static void setTestGetMentionCompletions(String communityId, String q, String contextId, ConnectApi.MentionCompletionType type, Integer pageParam, Integer pageSize, ConnectApi.MentionCompletionPage result) {}

}