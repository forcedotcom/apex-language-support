/**
 * Contains methods for getting information about an Experience Cloud user.
 */
public class CommunitiesUtil {

  /**
   * Returns the page to display after the current Experience Cloud user logs out.
   * @return String
   */
  public static String getLogoutUrl() {}

  /**
   * Returns the current user’s Experience Cloud display name.
   * @return String
   */
  public static String getUserDisplayName() {}

  /**
   * Indicates whether the current user isn’t logged in to the Experience Cloud site. Redirect the user to log in, if necessary.
   * @return Boolean
   */
  public static Boolean isGuestUser() {}

  /**
   * Indicates whether the current user is logged in as a member of the parent Salesforce organization, such as an employee.
   * @return Boolean
   */
  public static Boolean isInternalUser() {}

}