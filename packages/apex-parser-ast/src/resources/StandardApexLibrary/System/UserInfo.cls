/**
 * Contains methods for obtaining information about the context user.
 */
global class UserInfo {
    global Object UserInfo() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the context guest user’s unique visitor ID (UVID).
     * @return If a UVID isn’t available, returns null.
     */
    global static String getCurrentUvid() { return null; }

    /**
     * Returns the context user's default currency code for multiple currency organizations or the organization's currency code for single currency organizations.
     * <p>Usage
     * Note
     * For Apex saved using Salesforce API version 22.0 or earlier, getDefaultCurrency returns null for single currency organizations.
     */
    global static String getDefaultCurrency() { return null; }

    /**
     * Returns the context user's first name
     */
    global static String getFirstName() { return null; }

    /**
     * Returns the context user's language
     */
    global static String getLanguage() { return null; }

    /**
     * Returns the context user's last name
     */
    global static String getLastName() { return null; }

    /**
     * Returns the context user's locale.
     * <p>Example
     * String result = UserInfo.getLocale();
     * System.assertEquals('en_US', result);
     */
    global static String getLocale() { return null; }

    /**
     * Returns the context user's full name. The format of the name depends on the language preferences specified for the organization.
     * <p>Usage
     * The format is one of the following:
     * FirstName LastName
     * LastName, FirstName
     */
    global static String getName() { return null; }

    /**
     * Returns the context organization's ID.
     */
    global static String getOrganizationId() { return null; }

    /**
     * Returns the context organization's company name.
     */
    global static String getOrganizationName() { return null; }

    /**
     * Returns the context user's profile ID.
     */
    global static String getProfileId() { return null; }

    /**
     * Returns the session ID for the current session.
     * <p>Usage
     * You can use getSessionId() both synchronously and asynchronously. In asynchronous Apex (Batch, Future, Queueable, or Scheduled Apex), this method returns the session ID only when the code is run by an active, valid user. When the code is run by an internal user, such as the automated process user or a proxy user, the method returns null.
     * As a best practice, ensure that your code handles both cases: when a session ID is or is not available.
     * Note
     * If you use a JWT-based access token for session authentication, you can’t use UserInfo.getSessionId(). To use UserInfo.getSessionId(), use an opaque access token instead. Ensure that the “Issue JSON Web Token (JWT)-based access tokens for named users” setting isn’t selected for your external client app or connected app.
     */
    global static String getSessionId() { return null; }

    /**
     * Returns the current user’s local time zone.
     * <p>Example
     * TimeZone tz =
     *   UserInfo.getTimeZone();
     * System.debug(
     *   'Display name: ' +
     *   tz.getDisplayName());
     * System.debug(
     *   'ID: ' +
     *   tz.getID());
     */
    global static System.TimeZone getTimeZone() { return null; }

    /**
     * Returns the preferred theme for the current user. Use getUiThemeDisplayed to determine the theme actually displayed to the current user.
     * @return The preferred theme for the current user.
     * Valid values include:
     * Theme1—Obsolete Salesforce theme
     * Theme2—Salesforce Classic 2005 user interface theme
     * Theme3—Salesforce Classic 2010 user interface theme
     * Theme4d—Modern “Lightning Experience” Salesforce theme
     * Theme4t—Salesforce mobile app theme
     * Theme4u—Lightning Console theme
     * PortalDefault—Salesforce Customer Portal theme that applies to Customer Portals only and not to Experience Builder sites
     * Webstore—AppExchange theme
     */
    global static String getUiTheme() { return null; }

    /**
     * Returns the theme being displayed for the current user.
     * @return The theme being displayed for the current user
     * Valid values include:
     * Theme1—Obsolete Salesforce theme
     * Theme2—Salesforce Classic 2005 user interface theme
     * Theme3—Salesforce Classic 2010 user interface theme
     * Theme4d—Modern “Lightning Experience” Salesforce theme
     * Theme4t—Salesforce mobile app theme
     * Theme4u—Lightning Console theme
     * PortalDefault—Salesforce Customer Portal theme that applies to Customer Portals only and not to Experience Builder sites
     * Webstore—AppExchange theme
     */
    global static String getUiThemeDisplayed() { return null; }

    /**
     * Returns the current user’s email address.
     * <p>Example
     * String emailAddress =
     *   UserInfo.getUserEmail();
     * System.debug(
     *   'Email address: ' +
     *   emailAddress);
     */
    global static String getUserEmail() { return null; }

    /**
     * Returns the context user's ID
     */
    global static String getUserId() { return null; }

    /**
     * Returns the context user's login name.
     */
    global static String getUserName() { return null; }

    /**
     * Returns the context user's role ID.
     */
    global static String getUserRoleId() { return null; }

    /**
     * Returns the context user's type.
     */
    global static String getUserType() { return null; }

    /**
     * Returns true if the context user has a license to the managed package via a package license only. Otherwise, returns false.
     */
    global static Boolean hasPackageLicense(Id packageId) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the context user has a license to any managed package denoted by the namespace. Otherwise, returns false.
     * <p>Usage
     * A TypeException is thrown if namespace is an invalid type.
     */
    global static Boolean isCurrentUserLicensed(String namespacePrefix) { return false; }

    /**
     * Returns true if the context user has a license to the managed package denoted by the package ID. Otherwise, returns false. If the context user has access, it’s determined either via the package license or a namespace permission set license for the package namespace.
     * <p>Usage
     * Retrieve packageID at runtime, with the getCurrentPackageId() method. Then, use packageId to confirm that the contextual user is licensed to use that managed package.
     * A TypeException is thrown if packageID is an invalid type or is the ID of an unlocked or unmanaged package.
     */
    global static Boolean isCurrentUserLicensedForPackage(Id packageId) { return false; }

    /**
     * Specifies whether the organization uses multiple currencies.
     */
    global static Boolean isMultiCurrencyOrganization() { return false; }

    global override virtual String toString() { return null; }
}