/**
 * Contains methods to manage end users, for example, to register their verification methods, verify their identity, or remove their personal information.
 * <p>Usage
 * Let users register and deregister identity verification methods. Create custom Login and Verify pages for passwordless login and self-registration. Convert mobile phone numbers to the proper format before registering users. Scramble user data when users request that Salesforce remove their personal information.
 * This class is available in API version 43.0 and later.
 */
global class UserManagement {
    global Object UserManagement() { return null; }

    /**
     * Deregisters an identity verification method. Use this method to let users delete an existing verification method.
     * <p>Usage
     * Use this method to deregister an existing identity verification method. For example, your users can deregister a phone number when their phone number changes. While only end users can register an identity verification method, you and your users can deregister one. Keep this behavior in mind when you implement a custom registration page.
     * This method is available in API version 43.0 and later.
     * Note
     * This method doesn't support deregistering built-in authenticators.
     */
    global static void deregisterVerificationMethod(Id userId, Auth.VerificationMethod method) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Formats a mobile phone number for a user. Call this method to ensure that the phone number is formatted properly before updating a user’s mobile phone number.
     * <p>Usage
     * Use this method to ensure a user’s mobile phone number is formatted as required by Salesforce. Then use the method’s return value to update the mobile field of the user’s record. This mobile number is used for SMS-based device activation. For example, mobile phone numbers are stored along with other identity verification methods in Auth.VerificationMethod enum. This method is introduced in API version 43.0. It isn't available in earlier versions.
     * Here are some acceptable ways that users can enter their mobile number:
     * +1, (415) 555-1234 (with plus signs, parentheses, and dashes)
     * 1, 4155551234 (only numbers, no symbols)
     * 1 , 415-555-1234 (extra spaces)
     * Now, consider the following examples.
     * Correct examples:
     * formatPhoneNumber('1', '4155551234');
     * formatPhoneNumber('+1','(415) 555-1234');
     * formatPhoneNumber('1', '415-555-1234');
     * Incorrect example, because the country code and mobile number aren’t separated:
     * formatPhoneNumber(null, '+1 415-555-1234');
     * Example that doesn’t generate an error, but likely won’t work as intended:
     * formatPhoneNumber('+1', '+1 (415) 555-1234');
     * <p>Format Phone Number Code Example
     * Here's a code example that uses the formatPhoneNumber method. It gets the mobile number from the user and converts it to the format required by Salesforce. Then it updates the user’s record with the formatted mobile number.
     * global with sharing class PhoneRegistrationController {
     *     //Input variables
     *     global String countryCode {get; set;}
     *     global String phoneNumber {get; set;}
     *
     *     global String addPhoneNumber()
     *     {
     *         if(countryCode == null) return 'Country code is required';
     *         if(phoneNumber == null) return 'Phone number is required';
     *
     *         String userId = UserInfo.getUserId();
     *         User u = [SELECT Id FROM User WHERE Id=:userId LIMIT 1];
     *         String formatNum = System.UserManagement.formatPhoneNumber(countryCode, phoneNumber);
     *         u.MobilePhone = formatNum;
     *         update u;
     *         return null;
     *     }
     *
     * }
     * As long as the country code and phone number are separated, formatPhoneNumber returns a value in the proper format.
     * @return Returns a user’s mobile phone number in the proper format.
     */
    global static String formatPhoneNumber(String countryCode, String phoneNumber) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Invokes a verification challenge for passwordless login when creating custom (Visualforce) Login and Verify pages for customers and partners.
     * <p>Usage
     * Use this method along with its paired verifyPasswordlessLogin to customize the login experience with your own Visualforce Login and Verify pages. Invoke initPasswordlessLogin from the Login page where the user enters an email address or phone number.
     * Note
     * An alternative to using this combination of methods is to use Site.passwordlessLogin. Both approaches let you customize the Login page in Visualforce. With the paired methods, you can create custom Login and Verify pages. With Site.passwordlessLogin, Salesforce supplies the Verify page.
     * First call the initPasswordlessLogin method to initiate an authentication challenge. This method:
     * Gets the user ID and verification method, such as EMAIL or SMS, from the Login page.
     * Looks up the user and checks that the user is unique and active.
     * Sends a verification code to the user.
     * Adds an entry for the verification attempt to the Identity Verification History log, assigning an identifier to the verification attempt and setting the status to User challenged, waiting for response.
     * Adds an entry for the Passwordless Login to the Login History log.
     * Returns the identifier to verifyPasswordlessLogin to link the transactions.
     * Then call verifyPasswordlessLogin, which, if the user enters the verification code correctly, logs in the user.
     * Note
     * Users must verify their identity by email address or phone number before they can log in without a password. You can check whether the user is verified from the user’s detail page in Setup. Or you can check programmatically with <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.object_reference.meta/object_reference/sforce_api_objects_twofactormethodsinfo.htm" target="_blank" title="HTML (New Window)">TwoFactorMethodsInfo</a>.
     * @return Identifier of the verification attempt.
     */
    global static String initPasswordlessLogin(Id userId, Auth.VerificationMethod method) { return null; }

    /**
     * Invokes a verification challenge for registering identity verification methods with a custom (Visualforce) page. Users can register either their email address or phone number.
     * <p>Usage
     * Use this method along with its paired verifyRegisterVerificationMethod to customize the process for registering a user’s verification method using a Visualforce Verify page.
     * First call the initRegisterVerificationMethod method to get the verification code sent to the user as input, and validate it. If the verification code isn’t valid, it returns an error message.
     * <p>Example
     * Here’s a code example that registers a user’s phone number as a verification method. When the user enters a verification code on the Visualforce page, it invokes registerUser(). The method calls the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_methods_system_userinfo.htm" target="_blank">UserInfo</a> class to get the User ID of the user who’s registering the verification method. Using the user ID, it then finds the user’s phone number. It also gets the user’s registration status to check whether the phone number is verified already. If the user is registered with a different phone number, the number is updated.
     * public void registerUser() {
     *         try {
     *             exceptionText='';
     *             String userId = UserInfo.getUserId();
     *             User u = [Select MobilePhone, Id from User Where Id=:userId];
     *              currPhone = u.MobilePhone;
     *              mobilePhone = getFormattedSms(mobilePhone);
     *            if (mobilePhone != null && mobilePhone != '') {
     *            u.MobilePhone = mobilePhone;
     *            update u;
     *             // We're updating the email and phone number before verifying. Roll back
     *            //  the change in the verify API if it is unsuccessful.
     *             exceptionText = System.
     *             UserManagement.initRegisterVerificationMethod(Auth.VerificationMethod.SMS);
     *             if(exceptionText!= null && exceptionText!=''){
     *                 isInit = false;
     *                 showInitException = true;
     *             } else {
     *                  isInit = false;
     *                  isVerify = true;
     *             }
     *             } else {
     *                 showInitException = true;
     *             }
     *         } catch (Exception e) {
     *             exceptionText = e.getMessage();
     *             isInit = false;
     *             showInitException = true;
     *         }
     *     }
     *
     * public void verifyUser() {
     *     // Take the user’s input for the code sent to their phone number
     *     exceptionText = System.UserManagement.         verifyRegisterVerificationMethod(code, Auth.VerificationMethod.SMS);
     *     if(exceptionText != null && exceptionText !=''){
     *     showInitException = true;
     *     } else {
     *             //Success
     *     }
     * }
     * @return The method returns an error message if the phone number is already registered, the user isn’t a customer or partner, or if the context isn’t an Experience Cloud site.
     */
    global static String initRegisterVerificationMethod(Auth.VerificationMethod method) { return null; }

    /**
     * Invokes a verification challenge for self-registration when creating a custom (Visualforce) Verify page for Experience Cloud self-registration.
     * <p>Usage
     * By default, when users sign up for your Experience Cloud site with an email address or phone number, Salesforce sends them a verification code. At the same time, it generates a Verify page for users to confirm their identity. You can replace the default Salesforce Verify page with your own Visualforce page and then invoke the verification process.
     * Call this method to initiate the authentication challenge, and include a User object to insert if the registration is successful. The method returns the identifier for the self-registration attempt.
     * Note
     * If you specify a language in the LanguageLocaleKey field on the User object, Salesforce uses this language for verification email and SMS messages.
     * Then call verifySelfRegistration, which, if the user enters the verification code correctly, logs in the user.
     * <p>Example
     * This code contains the result of a verification challenge that registers a new user.
     * String id = System.UserManagement.initSelfRegistration
     *           (Auth.VerificationMethod.SMS, user);
     *         Auth.VerificationResult res = System.UserManagement.verifySelfRegistration
     *           (Auth.VerificationMethod.SMS, id, ‘123456’, null);
     *         if(res.success == true){
     *      //redirect
     * }
     * @return Identifier of the registration attempt.
     */
    global static String initSelfRegistration(Auth.VerificationMethod method, User u) { return null; }

    /**
     * Initiates a verification service for email, phone (SMS), and the Salesforce Authenticator verification methods.
     * <p>Usage
     * Use this method along with its paired verifyVerificationMethod to customize a verification service for EMAIL, SMS, or SALESFORCE_AUTHENTICATOR verification methods. The returned identifier from initVerificationMethod must be passed into verifyVerificationMethod.
     * First invoke the initVerificationMethod method to send a verification code to the user’s email or phone number, or to send a push notification to the Salesforce Authenticator. The user then enters the code or approves the push notification. If the verification code isn’t valid or the push notification isn’t approved, the service returns an error message.
     * <p>Email Example
     * This example shows multi-factor authentication using email.
     * public void initVerification() {
     * // user will receive code on their registered verified email
     *  identifier = UserManagement.initVerificationMethod(Auth.VerificationMethod.EMAIL);
     * }
     *
     * public Auth.VerificationResult verifyVerification() {
     * // requiring identifier from the initVerification
     * // the code will need to be entered in this method
     * return UserManagement.verifyVerificationMethod(identifier, code , Auth.VerificationMethod.EMAIL);
     * }
     * @return The returned identifier must be passed into verifyVerificationMethod.
     */
    global static String initVerificationMethod(Auth.VerificationMethod method) { return null; }

    /**
     * Initiates a verification service for email, phone (SMS), and the Salesforce Authenticator verification methods.
     * <p>Usage
     * Use this method along with its paired verifyVerificationMethod to customize a verification service for EMAIL, SMS, or SALESFORCE_AUTHENTICATOR verification methods. The returned identifier from initVerificationMethod must be passed into verifyVerificationMethod method.
     * First invoke the initVerificationMethod method to send a verification code to the user’s email or phone number, or to send a push notification to the Salesforce Authenticator. The user then enters the code or approves the push notification. If the verification code isn’t valid or the push notification isn’t approved, the service returns an error message.
     * <p>Salesforce Authenticator Example
     * This example shows multi-factor authentication (MFA) using the Salesforce Authenticator mobile app. In this example, the actionName parameter is set to the default setting and the extra parameter settings are set to false.
     * public void initVerification() {
     * // user will receive push notification on their registered MFA devices
     * identifier = UserManagement.initVerificationMethod(Auth.VerificationMethod.SALESFORCE_AUTHENTICATOR);
     * }
     *
     * public Auth.VerificationResult verifyVerification() {
     * // requiring identifier from the initVerification
     * // user will need to take the action on their registered MFA devices
     * return UserManagement.verifyVerificationMethod(identifier, '' , Auth.VerificationMethod.SALESFORCE_AUTHENTICATOR);
     * }
     * This example shows multi-factor authentication using Salesforce Authenticator. In this example, the actionName parameter is set to Connect to My Salesforce Org and the challenge_required extra parameter is set to true.
     * public void initVerification() {
     * Map<String,String> extras = new Map<String,String>();
     * extras.put('challenge_required','true');
     * // user will receive push notification in their registered MFA devices
     * identifier = UserManagement.initVerificationMethod(Auth.VerificationMethod.SALESFORCE_AUTHENTICATOR, 'Connect to My Salesforce Org', extras);
     * }
     *
     * public Auth.VerificationResult verifyVerification() {
     * // requiring identifier from the initVerification
     * // user will need to take the action on their registered MFA devices
     * return UserManagement.verifyVerificationMethod(identifier, '' , Auth.VerificationMethod.SALESFORCE_AUTHENTICATOR);
     * }
     * @return The returned identifier must be passed into verifyVerificationMethod method.
     */
    global static String initVerificationMethod(Auth.VerificationMethod method, String actionName, Map extras) { return null; }

    /**
     * Scrambles users’ data on their request when they no longer want their personal data recognized in Salesforce. When you invoke the method for the user, the data becomes anonymous, and you can never recover it.
     * <p>Usage
     * This method is introduced in API version 43.0. It isn't available in earlier versions.
     * You can use the obfuscateUser method to protect the personal information of your org’s users. When invoked, Salesforce permanently scrambles the user’s object data and replaces it with random character strings. The user’s detail page exists, but the fields contain meaningless strings of characters. Salesforce merely obfuscates (scrambles) personal data because you can't delete a user in Salesforce; you can only disable or deactivate a user. In other words, the user record remains in the database and this method performs a soft delete.
     * Note
     * Take care when using this method. The users’ data becomes anonymous and can never be recovered.
     * Considerations
     * This method requires that the org’s User Management setting, Scramble Specific Users' Data, is enabled from Setup.
     * This method affects the standard fields of the user object—excluding a few fields such as the user ID, timezone, locale, and profile.
     * If you want to send the user a confirmation, it’s recommended that you note the user's ID and other attributes for post processing, such as the email address.
     * This method changes only the user object. The association between the user and other objects is removed, but no other objects are changed. For example, contact, ThirdPartyAccountLink (TPAL), and user password authentication (UPA) objects remain unchanged.
     * Note
     * Assure your admins that invoking this method doesn’t trigger an email change notification.
     * This method is part of our effort to protect users’ personal data and privacy. For more information on what you can do to actively protect user data, see Data Protection and Privacy in Salesforce Help.
     * <p>ObfuscateUser Code Example
     * public class UserManagementController{
     *     public List <User> users {get; set;}
     *
     *     public UserManagementController()
     *     {
     *         Profile p = [select id from profile where name = 'Customer Community User'];
     *
     *         users = [select username, id from User where profileId=:p.id AND isactive=true];
     *     }
     *
     *     //Use method with extreme caution. Data can't be recovered.
     *     @InvocableMethod(label='User Management' description='Obfuscate User data and more')
     *     static public void obfuscate(List<User> users)
     *     {
     *         String uid = ApexPages.currentPage().getParameters().get('uid');
     *
     *         if(uid == null)
     *             return;
     *
     *         User u = [select contactId from user where id=:uid];
     *
     *         System.UserManagement.obfuscateUser(uid);
     *     }
     * }
     */
    global static void obfuscateUser(Id userId) { }

    /**
     * Scrambles users’ data on their request when they no longer want their personal data recognized in Salesforce. When you invoke the method for the user, the data becomes anonymous, and you can never recover it. Use this method to set the username to a specific value after it’s scrambled.
     * <p>Usage
     * This method is introduced in API version 43.0. It isn't available in earlier versions.
     * You can use the obfuscateUser method to protect the personal information of your org’s users. When invoked, Salesforce permanently scrambles the user’s object data and replaces it with random character strings. The user’s detail page exists, but the fields contain meaningless strings of characters. Salesforce merely obfuscates (scrambles) personal data because you can't delete a user in Salesforce; you can only disable or deactivate a user. In other words, the user record remains in the database and this method performs a soft delete.
     * Note
     * Take care when using this method. The users’ data becomes anonymous and can never be recovered.
     * Considerations
     * This method requires that the org’s User Management setting, Scramble Specific Users' Data, is enabled from Setup.
     * This method affects the standard fields of the user object—excluding a few fields such as the user ID, timezone, locale, and profile.
     * It is recommended that you note the user's ID and other attributes for post processing, such as the email address, if you want to send the user a confirmation.
     * This method changes only the user object. The association between the user and other objects is removed, but no other objects are changed. For example, contact, ThirdPartyAccountLink (TPAL), and user password authentication (UPA) objects remain unchanged.
     * Note
     * Assure your admins that invoking this method doesn’t trigger an email change notification.
     * This method is part of our effort to protect users’ personal data and privacy. For more information on what you can do to actively protect user data, see Data Protection and Privacy in Salesforce Help.
     */
    global static void obfuscateUser(Id userId, String username) { }

    /**
     * Registers an identity verification method. Verification methods can be a time-based one-time password (TOTP), email or text verification code, Salesforce Authenticator, or U2F-compatible security key. End users register verification methods for themselves.
     * <p>Usage
     * Use this method to enable users to complete identity verification, such as multi-factor authentication (MFA), or to log in to their Experience Cloud site without a password. Users register these methods to verify their identity when logging in. You create a custom registration page when implementing mobile-centric passwordless logins. See VerifyPasswordlessLogin.
     * The PageReference returned by registerVerificationMethod redirects the user to the Salesforce Verify page. If the user enters the correct code, the user is redirected to the Experience Cloud site page specified by the start URL. For example:
     * PageReference pr = System.UserManagement.registerVerificationMethod(Auth.VerificationMethod.TOTP,startUrl);
     * PageReference p =  System.UserManagement.deregisterVerificationMethod(userId,Auth.VerificationMethod.SALESFORCE_AUTHENTICATOR);
     *
     *
     * This method is available in API version 43.0 and later.
     * Note
     * As a security measure, when users add or update mobile numbers in their detail page, they must log in again to verify their identity. As a result, unsaved changes in the app are lost. To disable this security measure, contact Salesforce Support.
     */
    global static System.PageReference registerVerificationMethod(Auth.VerificationMethod method, String startUrl) { return null; }

    /**
     * Send an email message to a user’s email address for verification. The message contains a verification link (URL) that the user clicks to verify the email address later on. You can send email verifications in bulk.
     * <p>Usage
     * Sending an async email message is good practice to ensure that users are registered with a valid email address that they truly own. To determine which users receive an email with the verification link, check whether the User Verified Email field in the User detail page is set to true. You can also get this information from the TwoFactorMethodsInfo API.
     * Send async email verification to customers and partners to verify their email address. These users must verify their email address before they can log in with email OTP (passwordless login).
     * The error code and description are passed as query parameters so that you can process any errors when building a custom landing page.
     * <p>Example
     * System.UserManagement.sendAsyncEmailConfirmation('005RM000001a0Ox',
     * '00XRM000000hxnG','0DBRM000000015i', '/s/contactsupport');
     * @return Indicates whether sending the email message succeeded or failed.
     */
    global static Boolean sendAsyncEmailConfirmation(String userId, String emailTemplateId, String networkId, String startUrl) { return false; }

    global override virtual String toString() { return null; }

    /**
     * Completes a verification challenge during a passwordless login that uses a custom Verify page (Visualforce only). If the user who is trying to log in enters the verification code successfully, the user is logged in.
     * <p>Usage
     * Call this method to complete the passwordless login authentication process. It validates the verification method and verification code. It also checks that the identifier is the same as the one returned by initPasswordlessLogin.
     * <p>Example
     * For an example, see Auth.VerificationResult.
     * @return Result of the verification challenge, which includes the message displayed, and where the user is directed if they enter the verification code correctly.
     */
    global static Auth.VerificationResult verifyPasswordlessLogin(Id userId, Auth.VerificationMethod method, String identifier, String code, String startUrl) { return null; }

    /**
     * Completes registering a user’s email address or phone number as a verification method when customizing the identity verification process.
     * <p>Usage
     * Call verifyRegisterVerificationMethod to complete the process of registering a user’s verification method. This method checks whether the user entered the correct verification code. If the verification code is correct, the method
     * Confirms that the user entered the correct verification code
     * From the user’s detail page, updates the user's verification method status (sets the verification bit)
     * Sends an email to the user confirming that a verification method has been added to their record
     * If the verification code is incorrect, an error message is returned.
     * Note
     * If users want to change their email address after registering one, don’t use the initRegisterVerificationMethod and verify RegisterVerificationMethod methods. To enable automatic identity verification for email address changes, from the Identity Verification Setup page, select the field Require email confirmations for email address changes (applies to users in Experience Builder sites).
     * <p>Example
     * Here’s a code example that registers a user’s phone number as a verification method. When the user enters a verification code on the Visualforce page, it invokes registerUser(). The method gets the User ID of the user who’s registering the verification method and the user’s phone number. It also gets the user’s registration status to check whether the phone number is verified already. If the user is registered with a different phone number, the number is updated.
     * public void registerUser() {
     *         try {
     *             exceptionText='';
     *             String userId = UserInfo.getUserId();
     *             User u = [Select MobilePhone, Id from User Where Id=:userId];
     *              currPhone = u.MobilePhone;
     *              mobilePhone = getFormattedSms(mobilePhone);
     *            if (mobilePhone != null && mobilePhone != '') {
     *            u.MobilePhone = mobilePhone;
     *            update u;
     *             // We're updating the email and phone number before verifying. Roll back
     *            //  the change in the verify API if it is unsuccessful.
     *             exceptionText = System.
     *             UserManagement.initRegisterVerificationMethod(Auth.VerificationMethod.SMS);
     *             if(exceptionText!= null && exceptionText!=''){
     *                 isInit = false;
     *                 showInitException = true;
     *             } else {
     *                  isInit = false;
     *                  isVerify = true;
     *             }
     *             } else {
     *                 showInitException = true;
     *             }
     *         } catch (Exception e) {
     *             exceptionText = e.getMessage();
     *             isInit = false;
     *             showInitException = true;
     *         }
     *     }
     *
     * public void verifyUser() {
     *     // Take the user’s input for the code sent to their phone number
     *     exceptionText = System.UserManagement.         verifyRegisterVerificationMethod(code, Auth.VerificationMethod.SMS);
     *     if(exceptionText != null && exceptionText !=''){
     *     showInitException = true;
     *     } else {
     *             //Success
     *     }
     * }
     * @return If the user enters an incorrect verification code, the method returns an error message.
     */
    global static String verifyRegisterVerificationMethod(String code, Auth.VerificationMethod method) { return null; }

    /**
     * Completes a verification challenge when creating a custom (Visualforce) Verify page for Experience Cloud site self-registration. If the person who is attempting to register enters the verification code successfully, the user is created and logged in.
     * <p>Usage
     * By default, when users sign up for your Experience Cloud site with an email address or phone number, Salesforce sends them a verification code and generates a Verify page. This Verify page is where users enter the verification code to confirm their identity. You can replace this Salesforce-generated Verify page with a custom Verify page that you create with Visualforce. Then you invoke the verification process with Apex methods.
     * First, call the initSelfRegistration method, which returns the identifier of the user to create. Then call this verifySelfRegistration method to complete the verification process. If the user enters the verification code correctly, the user is created and directed to the page specified in the startURL.
     * This method returns the verification result, which contains the verification status and, if the user is created, the session ID. If the verification method is SMS, the User object must contain a properly formatted mobile number, which is country code, space, and then phone number, for example, +1 1234567890. Use System.UserManagement.formatPhoneNumber to ensure that the phone number is formatted correctly.
     * <p>Example
     * This code contains the result of a verification challenge that registers a new user.
     * String id = System.UserManagement.initSelfRegistration
     *           (Auth.VerificationMethod.SMS, user);
     *         Auth.VerificationResult res = System.UserManagement.verifySelfRegistration
     *           (Auth.VerificationMethod.SMS, id, ‘123456’, null);
     *         if(res.success == true){
     *      //redirect
     * }
     * @return Result of the verification challenge, which includes the message displayed, and where the user is directed when they enter the verification code correctly.
     */
    global static Auth.VerificationResult verifySelfRegistration(Auth.VerificationMethod method, String identifier, String code, String startUrl) { return null; }

    global static Auth.VerificationResult verifyVerificationMethod(String identifier, String code, Auth.VerificationMethod method) { return null; }
}