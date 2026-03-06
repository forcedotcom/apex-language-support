/**
 * Details necessary to render a view of a user profile.
 */
global class UserProfile {

  /**
   * The context user’s capabilities specific to the subject user’s profile.
   */
  global ConnectApi.UserCapabilities capabilities;

  /**
   * The ID of the user attached to the profile.
   */
  global String id;

  /**
   * The tabs visible to the context user specific to the subject user’s profile.
   */
  global List < ConnectApi.UserProfileTab > tabs;

  /**
   * The URL of the user’s profile.
   */
  global String url;

  /**
   * The details about the user attached to the profile.
   */
  global ConnectApi.UserDetail userDetail;

}