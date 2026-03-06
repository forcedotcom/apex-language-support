/**
 * Flag details on a feed item, comment, or file.
 */
global class ModerationFlagItemDetail {

  /**
   * ID of the user who flagged the item.
   */
  global String createdBy;

  /**
   * Date when the item was flagged.
   */
  global Datetime createdDate;

  /**
   * ID of the moderation flag.
   */
  global String id;

  /**
   * Type of moderation flag. Values are: FlagAsInappropriate —Flag for inappropriate content. FlagAsSpam —Flag for spam.
   */
  global ConnectApi.CommunityFlagType moderationType;

  /**
   * Note from user who flagged the item.
   */
  global String note;

  /**
   * Visibility behavior of a flag for various user types. Values are: ModeratorsOnly —The flag is visible only to users with moderation permissions on the flagged element or item. SelfAndModerators —The flag is visible to the creator of the flag and to users with moderation permissions on the flagged element or item.
   */
  global ConnectApi.CommunityFlagVisibility visibility;

}