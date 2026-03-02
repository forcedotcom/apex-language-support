/**
 * Contains methods to manage end users, for example, to register their verification methods, verify their identity, or remove their personal information.
 */
public class UserManagement {

  /**
   * Makes a duplicate copy of the System.UserManagement object.
   * @return Object
   */
  public Object clone() {}

  /**
   * Deregisters an identity verification method. Use this method to let users delete an existing verification method.
   * @param userId User ID of the user deregistering the verification method.
   * @param method Verification method used to verify the identity of the user.
   */
  public static void deregisterVerificationMethod(Id userId, Auth.VerificationMethod method) {}

  /**
   * Formats a mobile phone number for a user. Call this method to ensure that the phone number is formatted properly before updating a user’s mobile phone number.
   * @param countryCode A valid country code.
   * @param phoneNumber A mobile number that contains from 3 through 49 numeric characters, without the country code. For example, (415) 555-1234.
   * @return String
   */
  public static String formatPhoneNumber(String countryCode, String phoneNumber) {}

  /**
   * Invokes a verification challenge for passwordless login when creating custom (Visualforce) Login and Verify pages for customers and partners.
   * @param userId ID of the user who’s logging in.
   * @param method Method used to verify the user’s identity, which can be EMAIL or SMS.
   * @return String
   */
  public static String initPasswordlessLogin(Id userId, Auth.VerificationMethod method) {}

  /**
   * Invokes a verification challenge for registering identity verification methods with a custom (Visualforce) page. Users can register either their email address or phone number.
   * @param method Method used to verify the user’s identity, which can be EMAIL or SMS.
   * @return String
   */
  public static String initRegisterVerificationMethod(Auth.VerificationMethod method) {}

  /**
   * Invokes a verification challenge for self-registration when creating a custom (Visualforce) Verify page for Experience Cloud self-registration.
   * @param method Method used to verify the identity of the user, which can be EMAIL or SMS.
   * @param user User object to insert after successful registration. To see which fields are required, see User in the Object Reference for the Salesforce Platform .
   * @return String
   */
  public static String initSelfRegistration(Auth.VerificationMethod method, User user) {}

  /**
   * Initiates a verification service for email, phone (SMS), and the Salesforce Authenticator verification methods.
   * @param method Method used to initiate a verification service for EMAIL , SMS , or SALESFORCE_AUTHENTICATOR verification methods.
   * @return String
   */
  public static String initVerificationMethod(Auth.VerificationMethod method) {}

  /**
   * Initiates a verification service for email, phone (SMS), and the Salesforce Authenticator verification methods.
   * @param method Method used to initiate a verification service for EMAIL , SMS , or SALESFORCE_AUTHENTICATOR verification methods.
   * @param actionName 
   * @param String 
   * @param extras 
   * @return String
   */
  public static String initVerificationMethod(Auth.VerificationMethod method, String actionName, Map< String, String > extras) {}

  /**
   * Scrambles users’ data on their request when they no longer want their personal data recognized in Salesforce. When you invoke the method for the user, the data becomes anonymous, and you can never recover it. Use this method to set the username to a specific value after it’s scrambled.
   * @param userId ID of the user whose data this method scrambles.
   * @param username The username after the user’s data is scrambled. Sets the value of the scrambled username to a specific string.
   */
  public static void obfuscateUser(Id userId, String username) {}

  /**
   * Scrambles users’ data on their request when they no longer want their personal data recognized in Salesforce. When you invoke the method for the user, the data becomes anonymous, and you can never recover it. Use this method to set the username to a specific value after it’s scrambled.
   * @param userId ID of the user whose data this method scrambles.
   */
  public static void obfuscateUser(Id userId) {}

  /**
   * Registers an identity verification method. Verification methods can be a time-based one-time password (TOTP), email or text verification code, Salesforce Authenticator, or U2F-compatible security key. End users register verification methods for themselves.
   * @param method Verification method used to verify the identity of the user.
   * @param startUrl Path to the page that users see after they log in.
   * @return System.PageReference
   */
  public static System.PageReference registerVerificationMethod(Auth.VerificationMethod method, String startUrl) {}

  /**
   * Send an email message to a user’s email address for verification. The message contains a verification link (URL) that the user clicks to verify the email address later on. You can send email verifications in bulk.
   * @param userId ID of the user to receive the email confirmation.
   * @param emailTemplateId ID of the email template in which the verification link is defined. If null , Salesforce sends a default email. Here's how the default email looks.
   * @param networkId If verifying email addresses for Experience Cloud site users, the ID of the Experience Cloud site. In addition to external users (such as customers and partners), Experience Cloud site users can include internal users (such as employees) who are members of the site. To verify email addresses for internal users only, set this parameter to null .
   * @param startUrl The user is redirected to this page after verification, with a success or error message as the parameter. If null, the user is redirected to the login page.
   * @return Boolean
   */
  public static Boolean sendAsyncEmailConfirmation(String userId, String emailTemplateId, String networkId, String startUrl) {}

  /**
   * Completes a verification challenge during a passwordless login that uses a custom Verify page (Visualforce only). If the user who is trying to log in enters the verification code successfully, the user is logged in.
   * @param userId ID of the user who’s logging in.
   * @param method Method used to verify the identity of the user, which can be either EMAIL or SMS.
   * @param identifier ID of the verification attempt received from the initPasswordlessLogin method.
   * @param code Code used to verify the identity of the user.
   * @param startUrl The page where the user is directed after successful login.
   * @return Auth.VerificationResult
   */
  public static Auth.VerificationResult verifyPasswordlessLogin(Id userId, Auth.VerificationMethod method, String identifier, String code, String startUrl) {}

  /**
   * Completes registering a user’s email address or phone number as a verification method when customizing the identity verification process.
   * @param code Code used to verify the identity of the user.
   * @param method Method used to verify the identity of the user, which can be either EMAIL or SMS.
   * @return String
   */
  public static String verifyRegisterVerificationMethod(String code, Auth.VerificationMethod method) {}

  /**
   * Completes a verification challenge when creating a custom (Visualforce) Verify page for Experience Cloud site self-registration. If the person who is attempting to register enters the verification code successfully, the user is created and logged in.
   * @param method Method used to verify the identity of the user, which can be either EMAIL or SMS.
   * @param identifier The unique identifier received from the initSelfRegistration method.
   * @param code Code used to verify the identity of the user.
   * @param startUrl The page where the user is directed after successful self-registration. For the Self-Registration component , set the Start URL in the component properties instead.
   * @return Auth.VerificationResult
   */
  public static Auth.VerificationResult verifySelfRegistration(Auth.VerificationMethod method, String identifier, String code, String startUrl) {}

  /**
   * Completes the verification service for email, phone (SMS), Salesforce Authenticator, password, or time-based one-time password (TOTP) verification methods.
   * @param identifier Identifier returned from initVerificationMethod for EMAIL , SMS , and SALESFORCE_AUTHENTICATOR .
   * @param code Code used to verify the user’s identity for EMAIL , SMS , or PASSWORD .
   * @param method Method used to verify the user’s identity, which can be EMAIL , PASSWORD , SALESFORCE_AUTHENTICATOR , SMS , or TOTP .
   * @return VerificationResult
   */
  public static VerificationResult verifyVerificationMethod(String identifier, String code, Auth.VerificationMethod method) {}

}