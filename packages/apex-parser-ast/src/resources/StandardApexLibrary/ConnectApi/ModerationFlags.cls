/**
 * Information about the moderation flags on a feed item, comment, or file.
 */
global class ModerationFlags {

  /**
   * Number of moderation flags on this feed item, comment, or file. If the context user is not a moderator, the property is null .
   */
  global Integer flagCount;

  /**
   * Number of moderation flags categorized by reason. Values for ConnectApi.CommunityFlagReasonType are: FlaggedByRule —Moderation rule flagged the item. FlaggedBySystem —Einstein flagged the item. FlaggedByUserAsInappropriate —User flagged the item as inappropriate. FlaggedByUserAsSpam —User flagged the item as spam.
   */
  global Map < ConnectApi.CommunityFlagReasonType , Integer > flagCountByReason;

  /**
   * true if the context user flagged the feed item, comment, or file for moderation; false otherwise.
   */
  global Boolean flaggedByMe;

  /**
   * Collection of flags.
   */
  global ConnectApi.ModerationFlagsCollection flags;

}