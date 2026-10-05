/**
 * Contains methods for verifying users’ identity, creating custom login flows, customizing security levels, and defining trusted IP ranges for a current session.
 */
global class SessionManagement {
    global SessionManagement() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Finishes the My Domain Login Discovery login process.
     * <p>Usage
     * Include this method when implementing the MyDomainLoginDiscoveryHandler interface to direct users to an authentication mechanism, and then log them in. If users enter a username in the login page, they are sent to the password page for authentication. If users are enrolled in Lightning Login, they are directed to the Salesforce Authenticator to authenticate. If users are SSO-enabled, they are sent to the suitable identity provider (IdP) to authenticate.
     * The calling user requires Manage Users permission. If the user passed in is frozen or inactive, the method throws an exception.
     * After implementing the MyDomainLoginDiscoveryHandler interface, register the Login Discovery handler from the My Domain Setup page. Under Authentication Configuration, select this handler from the list of Apex classes.
     */
    global static System.PageReference finishLoginDiscovery(Auth.LoginDiscoveryMethod method, Id userId) { return null; }

    /**
     * Finish the Visualforce Page login flow process, and redirect the user to the default home page.
     * <p>Usage
     * Include this method in the Apex controller of the Visualforce Page login flow when creating login flows programmatically. This method indicates that the login flow is finished and redirects the user to the Experience Cloud site’s default home page. The login process runs in a restricted session until users complete the process. Calling this method indicates that the login flow is complete, lifts the restriction, and gives users full access to the Experience Cloud site.
     */
    global static System.PageReference finishLoginFlow() { return null; }

    /**
     * Finish the Visualforce Page login flow process, and redirect the user to the specified start URL.
     * <p>Usage
     * Include this method in the Apex controller of the Visualforce Page login flow when creating login flows programmatically. This method indicates that the login flow is finished and redirects the user to the specified location in the Experience Cloud site. The login process runs in a restricted session until users complete the process. Calling this method indicates that the login flow is complete, lifts the restriction, and gives users full access to the Experience Cloud site.
     */
    global static System.PageReference finishLoginFlow(String startUrl) { return null; }

    /**
     * Initiates a user identity verification flow with the verification method that the user registered with, and returns a URL to the identity verification screen. For example, if you have a custom Visualforce page that displays sensitive account details, you can prompt the user to verify identity before viewing it.
     * <p>Usage
     * If the user is already registered to confirm identity using a time-based one-time password (TOTP), then the user is redirected to the one-time password identity verification flow and asked to provide a code.
     * If the user isn’t registered with any verification method (such as one-time password or Salesforce Authenticator version 2 or later), the user is prompted to download and verify identity using Salesforce Authenticator. The user can also choose a different verification method.
     * @return The URL where the user is redirected to verify identity.
     */
    global static String generateVerificationUrl(Auth.VerificationPolicy policy, String description, String retUrl) { return null; }

    /**
     * Returns a map of attributes for the current session.
     * <p>Usage
     * The map includes a ParentId value, which is the 18-character ID for the parent session, if one exists (for example, if the current session is for a canvas app). If the current session doesn’t have a parent, this value is null. The map also includes the LogoutUrl assigned to the current session.
     * If you create an Apex test method that calls this method, the test fails with an error such as, “Unexpected Exception: Current session unavailable." An error occurs because there isn’t a session in the context through which the test is being run.
     * When a session is reused, Salesforce updates the LoginHistoryId with the value from the most recent login.
     * <p>Example
     * The following example shows the name-value pairs in a map returned by getCurrentSession(). Note that UsersId includes an “s” in the name to match the name of the corresponding field in the AuthSession object.
     * {
     * SessionId=0Ak###############,
     * UserType=Standard,
     * ParentId=0Ak###############,
     * NumSecondsValid=7200,
     * LoginType=SAML Idp Initiated SSO,
     * LoginDomain=null,
     * LoginHistoryId=0Ya###############,
     * Username=user@domain.com,
     * CreatedDate=Wed Jul 30 19:09:29 GMT 2014,
     * SessionType=Visualforce,
     * LastModifiedDate=Wed Jul 30 19:09:16 GMT 2014,
     * LogoutUrl=https://google.com,
     * SessionSecurityLevel=STANDARD,
     * UsersId=005###############,
     * SourceIp=1.1.1.1
     * }
     */
    global static Map getCurrentSession() { return null; }

    /**
     * Returns the eligibility status for a user who’s logging in with Lightning Login when you set up your org with My Domain and use the Login Discovery page type. Use this method to redirect the user to a custom login flow. For example, use after a login attempt to redirect the user to password flow if the user is ineligible for Lightning Login.
     * <p>Example
     * Auth.LightningLoginEligibility eligibility =
     *     Auth.SessionManagement.getLightningLoginEligibility(id);
     * if (eligibility == Auth.LightningLoginEligibility.ELIGIBLE) {
     *     // success
     * }
     * @return Returns the current eligibility status.
     */
    global static Auth.LightningLoginEligibility getLightningLoginEligibility(Id userId) { return null; }

    /**
     * Returns a map containing a URL to a quick response (QR) code and a time-based one-time password (TOTP) shared secret to configure authenticator apps or devices for multi-factor authentication (MFA).
     * <p>Usage
     * The QR code encodes the returned secret as well as the current user's username. The keys are qrCodeUrl and secret. Calling this method does not change any state for the user, nor does it read any state from the user. This method returns a brand new secret every time it is called, does not save that secret anywhere, and does not validate the TOTP token. The admin must explicitly save the values for the user after verifying a TOTP token with the secret.
     * The secret is a base32-encoded string of a 20-byte shared key.
     * <p>Example
     * The following is an example of how to request the QR code.
     * public String getGetQRCode() {
     *         return getQRCode();
     *     }
     *     public String getQRCode() {
     *        Map<String, String> codeResult = Auth.SessionManagement.getQrCode();
     *        String result = 'URL: '+codeResult.get('qrCodeUrl') + ' SECRET:  ' + codeResult.get('secret');
     *        return result;
     *     }
     * The following is an example of a returned map.
     * {qrCodeUrl=https://www.salesforce.com/secur/qrCode?w=200&h=200&t=tf&u=user%0000000000.com&s=AAAAA7B5BBBB5AAAAAAA66BBBB,
     *       secret=AAAAA7B5AAAAAA5BBBBBBBBB66AAA}
     */
    global static Map getQrCode() { return null; }

    /**
     * Indicates the required login security session level for the given profile.
     * @return The session security level required at login for the profile with the ID profileId. You can customize the assignment of each level in Session Settings. For example, you can set the High Assurance level to apply only to users who authenticated with multi-factor authentication (MFA) or through a specific identity provider.
     */
    global static Auth.SessionLevel getRequiredSessionLevelForProfile(String profileId) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * This method is reserved for internal Salesforce use.
     */
    global static Map ignoreForConcurrentSessionLimit(Object sessions) { return null; }

    /**
     * Indicates whether the given IP address is within the organization's trusted IP range according to the organization's Network Access settings.
     * <p>Usage
     * If a trusted IP range is not defined, this returns false, and throws an exception if the IP address is not valid.
     * Trusted IP Range Exists? User is in the Trusted IP Range? Return Value
     * Yes Yes true
     * Yes No false
     * No N/A false
     */
    global static Boolean inOrgNetworkRange(String ipAddress) { return false; }

    /**
     * Indicates whether the given IP address is within the trusted IP range for the given profile.
     * <p>Usage
     * If a trusted IP range is not defined, this returns true, and throws an exception if the IP address is not valid or if the profile ID is not valid.
     * Trusted IP Range Exists? User is in the Trusted IP Range? Return Value
     * Yes Yes true
     * Yes No false
     * No N/A true
     */
    global static Boolean isIpAllowedForProfile(String profileId, String ipAddress) { return false; }

    /**
     * Sets the user's current session security level.
     * <p>Usage
     * This setting affects the session level of all sessions associated with the current session, such as Visualforce or UI access.
     * If you create an Apex test method that calls this method, the test fails with an error such as, “Unexpected Exception: Current session unavailable." An error occurs because there isn’t a session in the context through which the test is being run.
     * <p>Example
     * The following is an example class for setting the session level.
     * public class RaiseSessionLevel{
     *     public void setLevelHigh() {
     *         Auth.SessionManagement.setSessionLevel(Auth.SessionLevel.HIGH_ASSURANCE);
     *     }
     *     public void setLevelStandard() {
     *         Auth.SessionManagement.setSessionLevel(Auth.SessionLevel.STANDARD);
     *     }
     * }
     */
    global static void setSessionLevel(Auth.SessionLevel level) { }

    global override virtual String toString() { return null; }

    /**
     * Deprecated. Use validateTotpTokenForKey(totpSharedKey, totpCode, description) instead.
     * <p>Usage
     * If the key is invalid or doesn’t exist, this method throws an invalid parameter value exception or a no data found exception, respectively. If the current user exceeds the maximum of 10 token validation attempts, this method throws a security exception.
     */
    global static Boolean validateTotpTokenForKey(String totpSharedKey, String totpCode) { return false; }

    /**
     * Indicates whether a time-based one-time password (TOTP) code (token) is valid for the given shared key.
     * <p>Usage
     * If the key is invalid or doesn’t exist, this method throws an invalid parameter value exception or a no data found exception, respectively. If the current user exceeds the maximum of 10 token validation attempts, this method throws a security exception.
     */
    global static Boolean validateTotpTokenForKey(String totpSharedKey, String totpCode, String description) { return false; }

    /**
     * Deprecated. Use validateTotpTokenForUser(totpCode, description) instead.
     * <p>Usage
     * If the current user does not have a TOTP code, this method throws an exception. If the current user has attempted too many validations, this method throws an exception.
     */
    global static Boolean validateTotpTokenForUser(String totpCode) { return false; }

    /**
     * Indicates whether a time-based one-time password (TOTP) code (token) is valid for the current user.
     * <p>Usage
     * If the current user does not have a TOTP code, or if the current user has attempted too many validations, this method throws an exception.
     */
    global static Boolean validateTotpTokenForUser(String totpCode, String description) { return false; }

    /**
     * Verifies the user code entered during the device authentication flow and redirects users to the OAuth approval page. If users aren’t logged in, they must log in. After successful login, users are prompted to allow the device to access Salesforce data.
     * <p>Usage
     * Include this method in the Apex controller when creating a custom Visualforce User Code Verification page for the OAuth 2.0 device authentication flow. This method verifies the user code, prompts the user to log in as needed, and prompts the user to allow the device access to Salesforce data. Upon successful verification and authentication, the user is redirected to the page defined by the start URL.
     */
    global static System.PageReference verifyDeviceFlow(String userCode, String startUrl) { return null; }
}