/**
 * Use the Site Class to manage your sites. Change, reset, validate, and check the expiration of passwords. Create site users, person accounts, and portal users. Get the admin email and ID. Get various URLs, the path prefix, the ID, the template, and the type of the site. Log in to the site.
 */
global class Site {
    global Site() { }

    global static System.PageReference changePassword(String newPassword, String verifyNewPassword) { return null; }

    /**
     * Changes the password of the current user.
     * <p>Usage
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     * The password reset process doesn't verify the external user's email address.
     */
    global static System.PageReference changePassword(String newPassword, String verifyNewPassword, String oldPassword) { return null; }

    /**
     * Creates a Salesforce Site or Experience Cloud site user for the given account and associates it with the site.
     * <p>Usage
     * This method throws Site.ExternalUserCreateException when user creation fails.
     * The nickname field is required for the User sObject when using the createExternalUser method.
     * Note
     * This method is only valid when a site is associated with a Customer Portal.
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     * @return The ID of the user that this method creates.
     */
    global static Id createExternalUser(SObject user, String accountId) { return null; }

    /**
     * Creates a Salesforce Site or Experience Cloud site user for the given account and associates it with the site. This method sends an email with the specified password to the user.
     * <p>Usage
     * This method throws Site.ExternalUserCreateException when user creation fails.
     * The nickname field is required for the User sObject when using the createExternalUser method.
     * Note
     * This method is only valid when a site is associated with a Customer Portal.
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     * @return The ID of the user that this method creates.
     */
    global static Id createExternalUser(SObject user, String accountId, String password) { return null; }

    /**
     * Creates a Salesforce Site or Experience Cloud site user and associates it with the given account. This method sends the user an email with the specified password and a new user confirmation email.
     * <p>Usage
     * This method throws Site.ExternalUserCreateException when user creation fails.
     * The nickname field is required for the User sObject when using the createExternalUser method.
     * Note
     * This method is only valid when a site is associated with a Customer Portal.
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     * @return The ID of the user that this method creates.
     */
    global static Id createExternalUser(SObject user, String accountId, String password, Boolean sendEmailConfirmation) { return null; }

    /**
     * Creates a person account using the default record type defined on the guest user's profile, then enables it for the site's portal.
     * <p>Usage
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     * Note
     * This method is only valid when a site is associated with a Customer Portal, and when the user license for the default new user profile is a high-volume portal user.
     */
    global static Id createPersonAccountPortalUser(SObject user, String ownerId, String password) { return null; }

    /**
     * Creates a person account using the specified recordTypeID, then enables it for the site's portal.
     * <p>Usage
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     * Note
     * This method is only valid when a site is associated with a Customer Portal, and when the user license for the default new user profile is a high-volume portal user.
     */
    global static Id createPersonAccountPortalUser(SObject user, String ownerId, String recordTypeId, String password) { return null; }

    /**
     * Creates a portal user for the given account and associates it with the site's portal.
     * <p>Usage
     * If you’re using API version 34.0 or later, we recommend using the createExternalUser() methods because they offer better error handling than this method.
     * The nickname field is required for the user sObject when using the createPortalUser method.
     * Note
     * This method is only valid when a site is associated with a Customer Portal.
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     */
    global static Id createPortalUser(SObject user, String accountId) { return null; }

    /**
     * Creates a portal user for the given account and associates it with the site's portal.
     * <p>Usage
     * If you’re using API version 34.0 or later, we recommend using the createExternalUser() methods because they offer better error handling than this method.
     * The nickname field is required for the user sObject when using the createPortalUser method.
     * Note
     * This method is only valid when a site is associated with a Customer Portal.
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     */
    global static Id createPortalUser(SObject user, String accountId, String password) { return null; }

    /**
     * Creates a portal user for the given account and associates it with the site's portal.
     * <p>Usage
     * If you’re using API version 34.0 or later, we recommend using the createExternalUser() methods because they offer better error handling than this method.
     * The nickname field is required for the user sObject when using the createPortalUser method.
     * Note
     * This method is only valid when a site is associated with a Customer Portal.
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     */
    global static Id createPortalUser(SObject user, String accountId, String password, Boolean sendEmailConfirmation) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Resets the user's password and sends an email to the user with the user’s new password. Returns a value indicating whether the password reset was successful.
     * <p>Usage
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     * Calls to this method are subject to rate-limiting. If your rate of calls exceeds the limit, Salesforce doesn't send the password reset email. If you experience this issue, try waiting for an hour before you send another call.
     * The password reset process doesn't verify the external user's email address.
     * Note
     * You can't use Site.forgotPassword with the @future method, which enables asynchronous execution.
     * @return Note
     * The return value is always true unless it’s called outside of a Visualforce page.
     */
    global static Boolean forgotPassword(String username) { return false; }

    global static Boolean forgotPassword(String username, String emailTemplateName) { return false; }

    /**
     * Returns the email address of the site administrator.
     */
    global static String getAdminEmail() { return null; }

    /**
     * Returns the user ID of the site administrator.
     */
    global static Id getAdminId() { return null; }

    /**
     * The tracking code associated with your site. Services such as Google Analytics can use this code to track page request data for your site.
     */
    global static String getAnalyticsTrackingCode() { return null; }

    /**
     * Returns a base URL for the current site that doesn’t use a force.com subdomain. The returned URL uses the same protocol (HTTP or HTTPS) as the current request if at least one non-Force.com custom URL that supports HTTPS exists on the site. The returned value never ends with a / character. If all the custom URLs in this site end in Force.com or this site has no custom URLs, then this returns an empty string. If the current request is not a site request, then this method returns an empty string. This method replaced getCustomWebAddress and includes the custom URL's path prefix..
     * <p>Usage
     * This method replaces getCustomWebAddress() and includes the custom URL's path prefix.
     */
    global static String getBaseCustomUrl() { return null; }

    /**
     * Deprecated. Returns a base URL for the current site that uses HTTP instead of HTTPS. The current request's domain is used. The returned value includes the path prefix and never ends with a / character. If the current request is not a site request, then this method returns an empty string.
     */
    global static String getBaseInsecureUrl() { return null; }

    /**
     * Returns the base URL of the current site for the requested URL. This isn't influenced by the referring page's URL. The returned URL uses the same protocol (HTTP or HTTPS) as the current request. The returned value includes the path prefix and never ends with a / character. If the current request is not a site request, then this method returns an empty string.
     */
    global static String getBaseRequestUrl() { return null; }

    /**
     * Returns a base URL for the current site that uses HTTPS instead of HTTP. The current request's domain is preferred if it supports HTTPS. Domains that are not Force.com subdomains are preferred over Force.com subdomains. A Force.com subdomain, if associated with the site, is used if no other HTTPS domains exist in the current site. If no HTTPS custom URLs exist in the site, then this method returns an empty string. The returned value includes the path prefix and never ends with a / character. If the current request is not a site request, then this method returns an empty string.
     */
    global static String getBaseSecureUrl() { return null; }

    /**
     * Returns the base URL of the current site that references and links should use. Note that this field may return the referring page's URL instead of the current request's URL. The returned value includes the path prefix and never ends with a / character. If the current request is not a site request, then this field returns an empty string. This field replaces getCurrentSiteUrl.
     * <p>Usage
     * This method replaces getCurrentSiteUrl().
     */
    global static String getBaseUrl() { return null; }

    /**
     * Deprecated. This method was replaced by getBaseUrl() in API version 30.0. Returns the base URL of the current site that references and links should use.
     * <p>Usage
     * Use getBaseUrl() instead.
     */
    global static String getCurrentSiteUrl() { return null; }

    /**
     * Deprecated. This method was replaced by getBaseCustomUrl() in API version 30.0.
     * <p>Usage
     * Use getBaseCustomUrl() instead.
     */
    global static String getCustomWebAddress() { return null; }

    /**
     * Returns your Salesforce Sites based URL.
     */
    global static String getDomain() { return null; }

    /**
     * Returns the error description for the current page if it’s a designated error page for the site and an error exists; otherwise, returns an empty string.
     */
    global static String getErrorDescription() { return null; }

    /**
     * Returns an error message for the current page if it’s a designated error page for the site and an error exists; otherwise, returns an empty string.
     */
    global static String getErrorMessage() { return null; }

    /**
     * Returns the value of the experience ID (expid). This expid value comes from a cookie in the user’s web browser.
     * <p>Usage
     * Use the getExperienceId and setExperienceId methods to implement dynamic login experiences. You can set the experience ID with setExperienceId or by extending the following endpoints with expid_value.
     * community-url/services/oauth2/authorize/expid_value
     * community-url/idp/endpoint/HttpPost/expid_value
     * community-url/idp/endpoint/HttpRedirect/expid_value
     * community-url_login_page/expid={value}
     * community-url/CommunitiesSelfReg?expid={value}
     * secur/forgotpassword.jsp?expid={value}
     * The cookie is set when the browser loads the URLs with the expid values.
     */
    global static String getExperienceId() { return null; }

    /**
     * Returns the value of the Master Label field for the current site. If the current request is not a site request, then this field returns null.
     */
    global static String getMasterLabel() { return null; }

    /**
     * Returns the API name of the current site.
     */
    global static String getName() { return null; }

    /**
     * Returns the original URL for this page if it’s a designated error page for the site; otherwise, returns null.
     */
    global static String getOriginalUrl() { return null; }

    /**
     * Returns the password requirements for a Salesforce Site or Experience Cloud site created with the Customer Service template.
     */
    global static String getPasswordPolicyStatement() { return null; }

    /**
     * Returns the URL path prefix of the current site or an empty string if none. For example, if the requested site URL is https://myco.my.salesforce-sites.com/partners, then /partners is the path prefix. If the current request is not a site request, then this method returns an empty string. This method replaced getPrefix in API version 30.0.
     */
    global static String getPathPrefix() { return null; }

    /**
     * Deprecated. This method was replaced by getPathPrefix() in API version 30.0.
     */
    global static String getPrefix() { return null; }

    global static Id getSiteId() { return null; }

    /**
     * Returns the API value of the site type field for the current site. This can be Visualforce for a Salesforce site, Siteforce for a Site.com site, ChatterNetwork for an Experience Cloud site, or ChatterNetworkPicasso for an Experience Cloud site. If the current request is not a site request, then this method returns null.
     */
    global static String getSiteType() { return null; }

    /**
     * Returns the value of the Site Type field's label for the current site. If the current request is not a site request, then this method returns null.
     */
    global static String getSiteTypeLabel() { return null; }

    /**
     * Returns the template name associated with the current site; returns the default template if no template has been designated.
     */
    global static System.PageReference getTemplate() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the current site is associated with an active login-enabled portal; otherwise returns false.
     */
    global static Boolean isLoginEnabled() { return false; }

    /**
     * For authenticated users, returns true if the currently logged-in user's password is expired. For non-authenticated users, returns false.
     */
    global static Boolean isPasswordExpired() { return false; }

    /**
     * Returns true if the current site is associated with an active self-registration-enabled Customer Portal; otherwise returns false.
     */
    global static Boolean isRegistrationEnabled() { return false; }

    /**
     * Returns true if the given username is valid; otherwise, returns false.
     */
    global static Boolean isValidUsername(String username) { return false; }

    /**
     * Allows users to log in to the current site with the given username and password, then takes them to the startUrl. If startUrl is not a relative path, it defaults to the site's designated index page.
     * <p>Usage
     * All DML statements before the call to Site.login get committed. It’s not possible to roll back to a save point that was created before a call to Site.login.
     * Note
     * Do not include http:// or https:// in the startURL.
     */
    global static System.PageReference login(String username, String password, String startUrl) { return null; }

    /**
     * Logs in a user to a Salesforce Site or Experience Cloud site using an identity verification method, such as email or text, instead of a password. Passwordless login is a convenient, mobile-centric way to welcome users into your site. Let your users log in with something other than their password, like their email address or phone number.
     * <p>Usage
     * Include this method in the Apex controller of a custom login page implementation.
     * <p>PasswordlessLogin Example
     * This simple code example of an Apex controller contains the passwordlessLogin method. The PageReference returned by passwordlessLogin redirects the user to the Salesforce Verify page. When the user enters the correct code, the user is redirected to the site page specified by the start URL.
     * global with sharing class MFILoginController
     * {
     *    //Input variables
     *    global String input {get; set;}
     *    public String startURL  {get; set;}
     *    public List<Auth.VerificationMethod> methods;
     *    public String error;
     *
     *    global MFILoginController()
     *    {
     *        // Add verification methods in priority order
     *        methods = new List<Auth.VerificationMethod>();
     *        methods.add(Auth.VerificationMethod.SMS);
     *        methods.add(Auth.VerificationMethod.EMAIL);
     *        methods.add(Auth.VerificationMethod.U2F);
     *        methods.add(Auth.VerificationMethod.SALESFORCE_AUTHENTICATOR);
     *        methods.add(Auth.VerificationMethod.TOTP);
     *    }
     *
     *    global PageReference login() {
     *         List<User> users = null;
     *
     *         // Empty input
     *         if(input == null || input == '')
     *         {
     *             error = 'Enter Username';
     *             return null;
     *         }
     *
     *         users = [select name, id, email from User where username=:input];
     *         if(users == null || users.isEmpty())
     *         {
     *             error = 'Can\'t find a user';
     *             return null;
     *         }
     *
     *         if (startURL == null) startURL = '/';
     *         return Site.passwordlessLogin(users[0].id, methods, startURL);
     *     }
     * }
     */
    global static System.PageReference passwordlessLogin(Id userId, List methods, String startUrl) { return null; }

    /**
     * Sets the experience ID for the current user. Use this method to populate the value of the experience ID (expid) cookie in the user’s web browser.
     * <p>Usage
     * Use setExperienceId when you’re implementing dynamic login experiences. A login experience refers to a login page plus any secondary pages associated with the login page (such as multi-factor authentication (MFA) or a login flow). You define different login experiences depending on who users are or where they’re logging in from. For example, you can require a different registration process based on the user’s location. In this case, expIdValue includes a state or country code. When the user logs in, the URL contains the experience ID parameter, {expid}. The {expid} parameter is replaced by the value stored in expIdValue, such as .jp. Then the user is redirected to the Japanese login experience.
     * <p>Example
     * String expid = ApexPages.currentPage().getParameters().get('expid');
     *   if (expId != null) {
     *   Site.setExperienceId(expId);
     *   }
     */
    global static void setExperienceId(String expIdValue) { }

    /**
     * Sets the specified user information within the site’s portal via an authentication provider.
     * <p>Usage
     * This method is only valid when a site is associated with a Customer Portal.
     * Calls to this method in API version 30.0 and later can’t commit the transaction automatically. Calls to this method before API version 30.0 commit the transaction, making it impossible to roll back to a save point before the call.
     * For more information on an authentication provider, see RegistrationHandler.
     */
    global static void setPortalUserAsAuthProvider(SObject user, String accountId) { }

    global override virtual String toString() { return null; }

    /**
     * Indicates whether a given password meets the requirements specified by org-wide or profile-based password policies in the current user’s org.
     * <p>Usage
     * If validation fails when the method is run in a Lightning controller, this method throws an Apex exception describing the failed validation. If validation fails when the method is run in a Visualforce controller, the method provides Visualforce error messages.
     */
    global static void validatePassword(SObject user, String password, String confirmPassword) { }
}