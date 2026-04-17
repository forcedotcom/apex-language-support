/**
 * Capabilities associated with a user profile.
 */
global class UserCapabilities {

  /**
   * Specifies if the context user can use Chatter Messenger with the subject user ( true ) or not ( false )
   */
  global Boolean canChat;

  /**
   * Specifies if the context user can direct message the subject user ( true ) or not ( false )
   */
  global Boolean canDirectMessage;

  /**
   * Specifies if the context user can edit the subject user’s account ( true ) or not ( false )
   */
  global Boolean canEdit;

  /**
   * Specifies if the context user can follow the subject user’s feed ( true ) or not ( false )
   */
  global Boolean canFollow;

  /**
   * Specifies if the context user can view the feed of the subject user ( true ) or not ( false )
   */
  global Boolean canViewFeed;

  /**
   * Specifies if the context user can view the full profile of the subject user ( true ) or only the limited profile ( false )
   */
  global Boolean canViewFullProfile;

  /**
   * Specifies if the subject user is a Chatter moderator or admin ( true ) or not ( false )
   */
  global Boolean isModerator;

}