/**
 * Mention segment.
 */
global class MentionSegment extends ConnectApi.MessageSegment {

  /**
   * Specifies whether the mentioned user or group can see the post in which they are mentioned ( true ) or not ( false ).
   */
  global Boolean accessible;

  /**
   * Name of the mentioned user or group.
   */
  global String name;

  /**
   * Information about the mentioned user or group.
   */
  global ConnectApi.ActorWithId record;

  /**
   * Information about the mentioned user. Important In versions 29.0 and later, use the record property.
   */
  global ConnectApi.UserSummary user;

}