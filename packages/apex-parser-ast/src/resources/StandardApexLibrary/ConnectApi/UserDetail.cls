/**
 * Details about a user in an org.
 */
global class UserDetail extends ConnectApi.User {

  /**
   * Text from user's profile.
   */
  global String aboutMe;

  /**
   * User’s address.
   */
  global ConnectApi.Address address;

  /**
   * User’s banner photo.
   */
  global ConnectApi.BannerPhoto bannerPhoto;

  /**
   * Chatter activity statistics.
   */
  global ConnectApi.ChatterActivity chatterActivity;

  /**
   * User’s influence rank.
   */
  global ConnectApi.GlobalInfluence chatterInfluence;

  /**
   * User's email address.
   */
  global String email;

  /**
   * Number of users following this user.
   */
  global Integer followersCount;

  /**
   * Information about items the user is following.
   */
  global ConnectApi.FollowingCounts followingCounts;

  /**
   * Number of groups user is following.
   */
  global Integer groupCount;

  /**
   * true if user has access to Chatter; false otherwise.
   */
  global Boolean hasChatter;

  /**
   * true if user is active; false otherwise.
   */
  global Boolean isActive;

  /**
   * 18-character ID of the user’s manager.
   */
  global String managerId;

  /**
   * Locale-based concatenation of manager's first and last names.
   */
  global String managerName;

  /**
   * Collection of user's phone numbers.
   */
  global List < ConnectApi.PhoneNumber > phoneNumbers;

  /**
   * The number of times the user has been thanked.
   */
  global Integer thanksReceived;

  /**
   * Username of the user, such as Admin@mycompany.com .
   */
  global String username;

}