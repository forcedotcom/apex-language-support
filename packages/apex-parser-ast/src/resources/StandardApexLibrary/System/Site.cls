/**
 * Use the Site Class to manage your sites. Change, reset, validate, and check the expiration of passwords. Create site users, person accounts, and portal users. Get the admin email and ID. Get various URLs, the path prefix, the ID, the template, and the type of the site. Log in to the site.
 */
public class Site {

  /**
   * Changes the password of the current user.
   * @param newPassword 
   * @param verifyNewPassword 
   * @param oldPassword Optional only if the current user’s password has expired; otherwise, required.
   * @return System.PageReference
   */
  public static System.PageReference changePassword(String newPassword, String verifyNewPassword, String oldPassword) {}

  /**
   * Creates a Salesforce Site or Experience Cloud site user for the given account and associates it with the site.
   * @param user Information required to create a user. The email address of the user is used to look for matching contacts associated with the specified accountId . If a matching contact is found and is already used by an external user, self-registration isn’t successful. If a matching contact is found but isn’t used by an external user, it is used for the new external user. If there is no matching contact, a new contact is created for the new external user.
   * @param accountId The ID of the account you want to associate the user with.
   * @return Id
   */
  public static Id createExternalUser(SObject user, String accountId) {}

  /**
   * Creates a Salesforce Site or Experience Cloud site user for the given account and associates it with the site.
   * @param user Information required to create a user. The email address of the user is used to look for matching contacts associated with the specified accountId . If a matching contact is found and is already used by an external user, self-registration isn’t successful. If a matching contact is found but isn’t used by an external user, it is used for the new external user. If there is no matching contact, a new contact is created for the new external user.
   * @param accountId The ID of the account you want to associate the user with.
   * @param password 
   * @return Id
   */
  public static Id createExternalUser(SObject user, String accountId, String password) {}

  /**
   * Creates a Salesforce Site or Experience Cloud site user for the given account and associates it with the site.
   * @param user Information required to create a user. The email address of the user is used to look for matching contacts associated with the specified accountId . If a matching contact is found and is already used by an external user, self-registration isn’t successful. If a matching contact is found but isn’t used by an external user, it is used for the new external user. If there is no matching contact, a new contact is created for the new external user.
   * @param accountId The ID of the account you want to associate the user with.
   * @param password 
   * @param sendEmailConfirmation 
   * @return Id
   */
  public static Id createExternalUser(SObject user, String accountId, String password, Boolean sendEmailConfirmation) {}

  /**
   * Creates a person account using the default record type defined on the guest user's profile, then enables it for the site's portal.
   * @param user 
   * @param ownerId 
   * @param password 
   * @return ID
   */
  public static ID createPersonAccountPortalUser(sObject user, String ownerId, String password) {}

  /**
   * Creates a person account using the default record type defined on the guest user's profile, then enables it for the site's portal.
   * @param user 
   * @param ownerId 
   * @param recordTypeId 
   * @param password 
   * @return ID
   */
  public static ID createPersonAccountPortalUser(sObject user, String ownerId, String recordTypeId, String password) {}

  /**
   * Creates a portal user for the given account and associates it with the site's portal.
   * @param user 
   * @param accountId 
   * @param password (Optional) The password of the portal user. If not specified, or if set to null or an empty string, this method sends a new password email to the portal user.
   * @param sendEmailConfirmation (Optional) Determines whether a new user email is sent to the portal user. Set it to true to send a new user email to the portal user. The default is false , that is, the new user email isn't sent.
   * @return ID
   */
  public static ID createPortalUser(sObject user, String accountId, String password, Boolean sendEmailConfirmation) {}

  /**
   * Resets the user's password and sends an email to the user with the user’s new password. You can specify a custom email template or use the default email template. Returns a value indicating whether the password reset was successful.
   * @param username 
   * @return Boolean
   */
  public static Boolean forgotPassword(String username) {}

  /**
   * Returns the email address of the site administrator.
   * @return String
   */
  public static String getAdminEmail() {}

  /**
   * Returns the user ID of the site administrator.
   * @return ID
   */
  public static ID getAdminId() {}

  /**
   * The tracking code associated with your site. Services such as Google Analytics can use this code to track page request data for your site.
   * @return String
   */
  public static String getAnalyticsTrackingCode() {}

  /**
   * Returns a base URL for the current site that doesn’t use a force.com subdomain. The returned URL uses the same protocol (HTTP or HTTPS) as the current request if at least one non-Force.com custom URL that supports HTTPS exists on the site. The returned value never ends with a / character. If all the custom URLs in this site end in Force.com or this site has no custom URLs, then this returns an empty string. If the current request is not a site request, then this method returns an empty string. This method replaced getCustomWebAddress and includes the custom URL's path prefix..
   * @return String
   */
  public static String getBaseCustomUrl() {}

  /**
   * Deprecated. Returns a base URL for the current site that uses HTTP instead of HTTPS. The current request's domain is used. The returned value includes the path prefix and never ends with a / character. If the current request is not a site request, then this method returns an empty string.
   * @return String
   */
  public static String getBaseInsecureUrl() {}

  /**
   * Returns the base URL of the current site for the requested URL. This isn't influenced by the referring page's URL. The returned URL uses the same protocol (HTTP or HTTPS) as the current request. The returned value includes the path prefix and never ends with a / character. If the current request is not a site request, then this method returns an empty string.
   * @return String
   */
  public static String getBaseRequestUrl() {}

  /**
   * Returns a base URL for the current site that uses HTTPS instead of HTTP. The current request's domain is preferred if it supports HTTPS. Domains that are not Force.com subdomains are preferred over Force.com subdomains. A Force.com subdomain, if associated with the site, is used if no other HTTPS domains exist in the current site. If no HTTPS custom URLs exist in the site, then this method returns an empty string. The returned value includes the path prefix and never ends with a / character. If the current request is not a site request, then this method returns an empty string.
   * @return String
   */
  public static String getBaseSecureUrl() {}

  /**
   * Returns the base URL of the current site that references and links should use. Note that this field may return the referring page's URL instead of the current request's URL. The returned value includes the path prefix and never ends with a / character. If the current request is not a site request, then this field returns an empty string. This field replaces getCurrentSiteUrl.
   * @return String
   */
  public static String getBaseUrl() {}

  /**
   * Returns your Salesforce Sites based URL.
   * @return String
   */
  public static String getDomain() {}

  /**
   * Returns the error description for the current page if it’s a designated error page for the site and an error exists; otherwise, returns an empty string.
   * @return String
   */
  public static String getErrorDescription() {}

  /**
   * Returns an error message for the current page if it’s a designated error page for the site and an error exists; otherwise, returns an empty string.
   * @return String
   */
  public static String getErrorMessage() {}

  /**
   * Returns the value of the experience ID (expid). This expid value comes from a cookie in the user’s web browser.
   * @return String
   */
  public static String getExperienceId() {}

  /**
   * Returns the value of the Master Label field for the current site. If the current request is not a site request, then this field returns null .
   * @return String
   */
  public static String getMasterLabel() {}

  /**
   * Returns the API name of the current site.
   * @return String
   */
  public static String getName() {}

  /**
   * Returns the original URL for this page if it’s a designated error page for the site; otherwise, returns null .
   * @return String
   */
  public static String getOriginalUrl() {}

  /**
   * Returns the password requirements for a Salesforce Site or Experience Cloud site created with the Customer Service template.
   * @return String
   */
  public static String getPasswordPolicyStatement() {}

  /**
   * Returns the URL path prefix of the current site or an empty string if none. For example, if the requested site URL is https://myco.my.salesforce-sites.com/partners , then /partners is the path prefix. If the current request is not a site request, then this method returns an empty string. This method replaced getPrefix in API version 30.0.
   * @return String
   */
  public static String getPathPrefix() {}

  /**
   * Returns the ID of the current site. If the current request is not a site request, then this field returns null .
   * @return String
   */
  public static String getSiteId() {}

  /**
   * Returns the template name associated with the current site; returns the default template if no template has been designated.
   * @return System.PageReference
   */
  public static System.PageReference getTemplate() {}

  /**
   * Returns the API value of the site type field for the current site. This can be Visualforce for a Salesforce site, Siteforce for a Site.com site, ChatterNetwork for an Experience Cloud site, or ChatterNetworkPicasso for an Experience Cloud site. If the current request is not a site request, then this method returns null .
   * @return String
   */
  public static String getSiteType() {}

  /**
   * Returns the value of the Site Type field's label for the current site. If the current request is not a site request, then this method returns null .
   * @return String
   */
  public static String getSiteTypeLabel() {}

  /**
   * Returns true if the current site is associated with an active login-enabled portal; otherwise returns false .
   * @return Boolean
   */
  public static Boolean isLoginEnabled() {}

  /**
   * For authenticated users, returns true if the currently logged-in user's password is expired. For non-authenticated users, returns false .
   * @return Boolean
   */
  public static Boolean isPasswordExpired() {}

  /**
   * Returns true if the current site is associated with an active self-registration-enabled Customer Portal; otherwise returns false .
   * @return Boolean
   */
  public static Boolean isRegistrationEnabled() {}

  /**
   * Returns true if the given username is valid; otherwise, returns false .
   * @param username The username to test for validity.
   * @return Boolean
   */
  public static Boolean isValidUsername(String username) {}

  /**
   * Allows users to log in to the current site with the given username and password, then takes them to the startUrl . If startUrl is not a relative path, it defaults to the site's designated index page.
   * @param username 
   * @param password 
   * @param startUrl 
   * @return System.PageReference
   */
  public static System.PageReference login(String username, String password, String startUrl) {}

  /**
   * Logs in a user to a Salesforce Site or Experience Cloud site using an identity verification method, such as email or text, instead of a password. Passwordless login is a convenient, mobile-centric way to welcome users into your site. Let your users log in with something other than their password, like their email address or phone number.
   * @param userId ID of the user to log in.
   * @param methods List of identity verification methods available to the user for passwordless login.
   * @param startUrl Path to the page that users see after they log in.
   * @return System.PageReference
   */
  public static System.PageReference passwordlessLogin(Id userId, List<Auth.VerificationMethod> methods, String startUrl) {}

  /**
   * Sets the experience ID for the current user. Use this method to populate the value of the experience ID (expid) cookie in the user’s web browser.
   * @param expIdValue A value that indicates the user’s login experience. The value must contain alphanumeric characters only, up to 30 characters.
   */
  public static void setExperienceId(String expIdValue) {}

  /**
   * Sets the specified user information within the site’s portal via an authentication provider.
   * @param user 
   * @param contactId 
   * @return Void
   */
  public static Void setPortalUserAsAuthProvider(sObject user, String contactId) {}

  /**
   * Indicates whether a given password meets the requirements specified by org-wide or profile-based password policies in the current user’s org.
   * @param user The user attempting to create a password during self-registration for a Salesforce Site or Experience Cloud site.
   * @param password The password entered by the user.
   * @param confirmPassword The password reentered by the user to confirm the password.
   */
  public static void validatePassword(SObject user, String password, String confirmPassword) {}

}