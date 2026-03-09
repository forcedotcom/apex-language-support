/**
 * User.
 */
global class User extends ConnectApi.ActionWithId {

  /**
   * If one exists, an extra label for the user, for example, “Customer,” “Partner,” or “Acme Corporation.”
   */
  global String additionalLabel;

  /**
   * User’s nickname in the site.
   */
  global String communityNickname;

  /**
   * Name of the company. If your Experience Cloud site allows access without logging in, the value is null for guest users.
   */
  global String companyName;

  /**
   * User’s name that is displayed in the site. If nicknames are enabled, the nickname is displayed. If nicknames aren’t enabled, the full name is displayed.
   */
  global String displayName;

  /**
   * User's first name. In version 39.0 and later, if nicknames are enabled, firstName is null .
   */
  global String firstName;

  /**
   * true if user is a Chatter customer; false otherwise.
   */
  global Boolean isChatterGuest;

  /**
   * true if user is in the same site as the context user; false otherwise.
   */
  global Boolean isInThisCommunity;

  /**
   * User's last name. In version 39.0 and later, if nicknames are enabled, lastName is null .
   */
  global String lastName;

  /**
   * If one exists, extra out-of-office message for the user.
   */
  global ConnectApi.OutOfOffice outOfOffice;

  /**
   * Information about the user's photos.
   */
  global ConnectApi.Photo photo;

  /**
   * Reputation of the user.
   */
  global ConnectApi.Reputation reputation;

  /**
   * Collection of the user’s stamps. In version 44.0 and later, use SOQL to get a user’s stamps.
   */
  global List < ConnectApi.Stamp > stamps;

  /**
   * User’s title. If your Experience Cloud site allows access without logging in, the value is null for guest users.
   */
  global String title;

  /**
   * Type of user. ChatterGuest —User is an external user in a private group. ChatterOnly —User is a Chatter Free customer. Guest —User is unauthenticated. Internal —User is a standard org member. Portal —User is an external user in an Experience Cloud site. System —User is Chatter Expert or a system user. Undefined —User is a user type that is a custom object.
   */
  global ConnectApi.UserType Enum userType;

}