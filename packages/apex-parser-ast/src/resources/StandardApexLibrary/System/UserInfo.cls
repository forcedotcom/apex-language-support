/**
 * Contains methods for obtaining information about the context user.
 */
public class UserInfo {

  /**
   * Returns the context user's default currency code for multiple currency organizations or the organization's currency code for single currency organizations.
   * @return String
   */
  public static String getDefaultCurrency() {}

  /**
   * Returns the context user's first name
   * @return String
   */
  public static String getFirstName() {}

  /**
   * Returns the context user's language
   * @return String
   */
  public static String getLanguage() {}

  /**
   * Returns the context user's last name
   * @return String
   */
  public static String getLastName() {}

  /**
   * Returns the context user's locale.
   * @return String
   */
  public static String getLocale() {}

  /**
   * Returns the context user's full name. The format of the name depends on the language preferences specified for the organization.
   * @return String
   */
  public static String getName() {}

  /**
   * Returns the context organization's ID.
   * @return String
   */
  public static String getOrganizationId() {}

  /**
   * Returns the context organization's company name.
   * @return String
   */
  public static String getOrganizationName() {}

  /**
   * Returns the context user's profile ID.
   * @return String
   */
  public static String getProfileId() {}

  /**
   * Returns the session ID for the current session.
   * @return String
   */
  public static String getSessionId() {}

  /**
   * Returns the current user’s local time zone.
   * @return System.TimeZone
   */
  public static System.TimeZone getTimeZone() {}

  /**
   * Returns the preferred theme for the current user. Use getUiThemeDisplayed to determine the theme actually displayed to the current user.
   * @return String
   */
  public static String getUiTheme() {}

  /**
   * Returns the theme being displayed for the current user.
   * @return String
   */
  public static String getUiThemeDisplayed() {}

  /**
   * Returns the current user’s email address.
   * @return String
   */
  public static String getUserEmail() {}

  /**
   * Returns the context user's ID
   * @return String
   */
  public static String getUserId() {}

  /**
   * Returns the context user's login name.
   * @return String
   */
  public static String getUserName() {}

  /**
   * Returns the context user's role ID.
   * @return String
   */
  public static String getUserRoleId() {}

  /**
   * Returns the context user's type.
   * @return String
   */
  public static String getUserType() {}

  /**
   * Returns true if the context user has a license to the managed package via a package license only. Otherwise, returns false .
   * @param packageID 
   * @return Boolean
   */
  public static Boolean hasPackageLicense(ID packageID) {}

  /**
   * Returns true if the context user has a license to any managed package denoted by the namespace. Otherwise, returns false .
   * @param namespace 
   * @return Boolean
   */
  public static Boolean isCurrentUserLicensed(String namespace) {}

  /**
   * Returns true if the context user has a license to the managed package denoted by the package ID. Otherwise, returns false . If the context user has access, it’s determined either via the package license or a namespace permission set license for the package namespace.
   * @param packageID 
   * @return Boolean
   */
  public static Boolean isCurrentUserLicensedForPackage(ID packageID) {}

  /**
   * Specifies whether the organization uses multiple currencies.
   * @return Boolean
   */
  public static Boolean isMultiCurrencyOrganization() {}

}