/**
 * Get information about flagged feed items and comments in an Experience Cloud site. Add and remove flags from comments and feed items.
 */
public class CommunityModeration {

  public static ConnectApi.ModerationFlags addFlagToComment(String communityId, String commentId) {}

  public static ConnectApi.ModerationFlags addFlagToComment(String communityId, String commentId, ConnectApi.CommunityFlagVisibility visibility) {}

  public static ConnectApi.ModerationFlags addFlagToComment(String communityId, String commentId, ConnectApi.CommunityFlagType type) {}

  public static ConnectApi.ModerationFlags addFlagToComment(String communityId, String commentId, String note) {}

  public static ConnectApi.ModerationFlags addFlagToComment(String communityId, String commentId, ConnectApi.CommunityFlagType type, String note) {}

  public static ConnectApi.ModerationFlags addFlagToComment(String communityId, String commentId, ConnectApi.CommunityFlagType type, ConnectApi.CommunityFlagVisibility visibility) {}

  public static ConnectApi.ModerationFlags addFlagToComment(String communityId, String commentId, ConnectApi.CommunityFlagVisibility visibility, String note) {}

  public static ConnectApi.ModerationFlags addFlagToComment(String communityId, String commentId, ConnectApi.CommunityFlagType type, ConnectApi.CommunityFlagVisibility visibility, String note) {}

  public static ConnectApi.ModerationCapability addFlagToFeedElement(String communityId, String feedElementId) {}

  public static ConnectApi.ModerationCapability addFlagToFeedElement(String communityId, String feedElementId, ConnectApi.CommunityFlagVisibility visibility) {}

  public static ConnectApi.ModerationCapability addFlagToFeedElement(String communityId, String feedElementId, ConnectApi.CommunityFlagType type) {}

  public static ConnectApi.ModerationCapability addFlagToFeedElement(String communityId, String feedElementId, String note) {}

  public static ConnectApi.ModerationCapability addFlagToFeedElement(String communityId, String feedElementId, ConnectApi.CommunityFlagType type, String note) {}

  public static ConnectApi.ModerationCapability addFlagToFeedElement(String communityId, String feedElementId, ConnectApi.CommunityFlagType type, ConnectApi.CommunityFlagVisibility visibility) {}

  public static ConnectApi.ModerationCapability addFlagToFeedElement(String communityId, String feedElementId, ConnectApi.CommunityFlagVisibility visibility, String note) {}

  public static ConnectApi.ModerationCapability addFlagToFeedElement(String communityId, String feedElementId, ConnectApi.CommunityFlagType type, ConnectApi.CommunityFlagVisibility visibility, String note) {}

  public static ConnectApi.ModerationFlags getFlagsOnComment(String communityId, String commentId) {}

  public static ConnectApi.ModerationFlags getFlagsOnComment(String communityId, String commentId, ConnectApi.CommunityFlagVisibility visibility) {}

  public static ConnectApi.ModerationFlags getFlagsOnComment(String communityId, String commentId, Integer pageSize, String pageParam) {}

  public static ConnectApi.ModerationFlags getFlagsOnComment(String communityId, String commentId, ConnectApi.CommunityFlagVisibility visibility, Integer pageSize, String pageParam) {}

  public static ConnectApi.ModerationCapability getFlagsOnFeedElement(String communityId, String feedElementId) {}

  public static ConnectApi.ModerationCapability getFlagsOnFeedElement(String communityId, String feedElementId, ConnectApi.CommunityFlagVisibility visibility) {}

  public static ConnectApi.ModerationCapability getFlagsOnFeedElement(String communityId, String feedElementId, String pageParam, Integer pageSize) {}

  public static ConnectApi.ModerationCapability getFlagsOnFeedElement(String communityId, String feedElementId, ConnectApi.CommunityFlagVisibility visibility, Integer pageSize, String pageParam) {}

  public static ConnectApi.ModerationFlags removeFlagFromComment(String communityId, String commentId, String userId) {}

  public static void removeFlagFromFeedElement(String communityId, String feedElementId, String userId) {}

  public static ConnectApi.ModerationFlags addFlagToFeedItem(String communityId, String feedItemId) {}

  public static ConnectApi.ModerationFlags addFlagToFeedItem(String communityId, String feedItemId, ConnectApi.CommunityFlagVisibility visibility) {}

  public static ConnectApi.ModerationFlags getFlagsOnFeedItem(String communityId, String feedItemId) {}

  public static ConnectApi.ModerationFlags getFlagsOnFeedItem(String communityId, String feedItemId, ConnectApi.CommunityFlagVisibility visibility) {}

  public static ConnectApi.ModerationFlags removeFlagsOnFeedItem(String communityId, String feedItemId, String userId) {}

}