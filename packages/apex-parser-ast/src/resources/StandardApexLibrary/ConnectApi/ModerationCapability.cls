/**
 * If a feed element has this capability, users in an Experience Cloud site can flag it for moderation.
 */
global class ModerationCapability {

  /**
   * The moderation flags for this feed element. Moderators can view and take action on flagged items.
   */
  global ConnectApi.ModerationFlags moderationFlags;

}