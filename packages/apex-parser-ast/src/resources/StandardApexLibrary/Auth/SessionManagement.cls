/**
 * Contains methods for verifying users’ identity, creating custom login flows, customizing security levels, and defining trusted IP ranges for a current session.
 */
global class SessionManagement {

  /**
   * Finishes the My Domain Login Discovery login process.
   * @param method Verification method used with My Domain Login Discovery.
   * @param userId ID used to log in the user. The user must be active.
   * @return System.PageReference
   */
  public static System.PageReference finishLoginDiscovery(Auth.LoginDiscoveryMethod method, Id userId) {}

  /**
   * Finish the Visualforce Page login flow process, and redirect the user to the default home page.
   * @return System.PageReference
   */
  public static System.PageReference finishLoginFlow() {}

  /**
   * Finish the Visualforce Page login flow process, and redirect the user to the default home page.
   * @param startUrl 
   * @return System.PageReference
   */
  public static System.PageReference finishLoginFlow(String startUrl) {}

  /**
   * Initiates a user identity verification flow with the verification method that the user registered with, and returns a URL to the identity verification screen. For example, if you have a custom Visualforce page that displays sensitive account details, you can prompt the user to verify identity before viewing it.
   * @param policy The session security policy required to initiate identity verification for the user’s session. For example, if the policy is set to High Assurance level of session security, and the user’s current session has the standard level of session security, the user’s session is raised to high assurance after successful verification of identity. In the Setup user interface, this value is shown in the Triggered By column of Identity Verification History.
   * @param description The custom description that describes the activity requiring identity verification; for example, “Complete purchase and check out”. This text appears to users when they verify their identity in Salesforce and, if they use Salesforce Authenticator version 2 or later, in the Salesforce Authenticator mobile app. In addition, in the Setup user interface, this text is shown in the Activity Message column of Identity Verification History.
   * @param destinationUrl The relative or absolute Salesforce URL that you want to redirect the user to after identity verification—for example, /apex/mypage . The user is redirected to destinationUrl when the identity verification flow is complete, regardless of success. For example, if a user chooses to not respond to the identity challenge and cancels it, the user is still redirected to destinationUrl . As a best practice, ensure that your code for this page manually checks that the security policy was satisfied (and the user didn’t just manually type the URL in the browser). For example, if the policy is High Assurance, the target page checks that the user's session is high assurance before allowing access.
   * @return String
   */
  public static String generateVerificationUrl(Auth.VerificationPolicy policy, String description, String destinationUrl) {}

  /**
   * Returns a map of attributes for the current session.
   * @return Map< String , String >
   */
  public static Map< String , String > getCurrentSession() {}

  /**
   * Returns the eligibility status for a user who’s logging in with Lightning Login when you set up your org with My Domain and use the Login Discovery page type. Use this method to redirect the user to a custom login flow. For example, use after a login attempt to redirect the user to password flow if the user is ineligible for Lightning Login.
   * @param userId ID of the user who is logging in.
   * @return Auth.LightningLoginEligibility
   */
  public static Auth.LightningLoginEligibility getLightningLoginEligibility(Id userId) {}

  /**
   * Returns a map containing a URL to a quick response (QR) code and a time-based one-time password (TOTP) shared secret to configure authenticator apps or devices for multi-factor authentication (MFA).
   * @return Map< String , String >
   */
  public static Map< String , String > getQrCode() {}

  /**
   * Indicates the required login security session level for the given profile.
   * @param profileId The 15-character profile ID.
   * @return Auth.SessionLevel
   */
  public static Auth.SessionLevel getRequiredSessionLevelForProfile(String profileId) {}

  public static Map< String , String > ignoreForConcurrentSessionLimit(Object sessions) {}

  /**
   * Indicates whether the given IP address is within the organization's trusted IP range according to the organization's Network Access settings.
   * @param ipAddress The IP address to validate.
   * @return Boolean
   */
  public static Boolean inOrgNetworkRange(String ipAddress) {}

  /**
   * Indicates whether the given IP address is within the trusted IP range for the given profile.
   * @param profileId The 15-character alphanumeric string for the current user’s profile ID.
   * @param ipAddress The IP address to validate.
   * @return Boolean
   */
  public static Boolean isIpAllowedForProfile(String profileId, String ipAddress) {}

  /**
   * Sets the user's current session security level.
   * @param level The session security level to assign to the user. The meaning of each level can be customized in the Session Settings for each organization, such as setting the High Assurance level to apply only to users who authenticated with multi-factor authentication (MFA) or through a specific identity provider.
   */
  public static void setSessionLevel(Auth.SessionLevel level) {}

  /**
   * Deprecated. Use validateTotpTokenForKey(totpSharedKey, totpCode, description) instead.
   * @param sharedKey The shared (secret) key. The sharedKey must be a base32-encoded string of a 20-byte shared key.
   * @param totpCode The time-based one-time password (TOTP) code to validate.
   * @return Boolean
   */
  public static Boolean validateTotpTokenForKey(String sharedKey, String totpCode) {}

  /**
   * Deprecated. Use validateTotpTokenForKey(totpSharedKey, totpCode, description) instead.
   * @param totpSharedKey 
   * @param totpCode The time-based one-time password (TOTP) code to validate.
   * @param description 
   * @return Boolean
   */
  public static Boolean validateTotpTokenForKey(String totpSharedKey, String totpCode, String description) {}

  /**
   * Deprecated. Use validateTotpTokenForUser(totpCode, description) instead.
   * @param totpCode The time-based one-time password (TOTP) code to validate.
   * @return Boolean
   */
  public static Boolean validateTotpTokenForUser(String totpCode) {}

  /**
   * Deprecated. Use validateTotpTokenForUser(totpCode, description) instead.
   * @param totpCode The time-based one-time password (TOTP) code to validate.
   * @param description 
   * @return Boolean
   */
  public static Boolean validateTotpTokenForUser(String totpCode, String description) {}

  /**
   * Verifies the user code entered during the device authentication flow and redirects users to the OAuth approval page. If users aren’t logged in, they must log in. After successful login, users are prompted to allow the device to access Salesforce data.
   * @param userCode Human-readable user code provided to the user by Salesforce. The user must enter this code at the verification URL to approve device access to Salesforce data.
   * @param startUrl 
   * @return System.PageReference
   */
  public static System.PageReference verifyDeviceFlow(String userCode, String startUrl) {}

}