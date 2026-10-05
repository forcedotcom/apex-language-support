/**
 * Contains methods for configuring settings for users to log in to a Salesforce org using their authentication provider credentials instead of their Salesforce credentials. The authentication provider can be any authentication provider that supports the OpenID Connect protocol, such as Google, Facebook, or Twitter. Users log in to either an Experience Cloud site (https://MyDomainName.my.site.com) or your My Domain login URL (https://MyDomainName.my.salesforce.com).
 * <p>Example
 * This example shows how to call some methods on the Auth.AuthConfiguration class. Before you can run this sample, you must provide valid values for the URLs and developer name.
 * String communityUrl = 'MyDomainName.my.site.com';
 * String startUrl = '<Add URL>';
 * Auth.AuthConfiguration authConfig = new Auth.AuthConfiguration(communityUrl,startUrl);
 * List<AuthProvider> authPrvs = authConfig.getAuthProviders();
 * String bColor = authConfig.getBackgroundColor();
 * String fText = authConfig.getFooterText();
 *
 * String sso = Auth.AuthConfiguration.getAuthProviderSsoUrl(communityUrl, startUrl, 'developerName');
 */
global class AuthConfiguration {
    /**
     * Creates an instance of the AuthConfiguration class using the specified URL for an Experience Cloud site or a My Domain subdomain and the start URL for authenticated users.
     */
    global AuthConfiguration(String URL, String start_URL) { }

    @Deprecated
    global AuthConfiguration(Id networkId, String start_URL) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Indicates whether the Experience Cloud site allows internal users to log in using the Experience Cloud site login page. To enable, admins configure the setting Allow internal users to log in directly to the experience on the Login & Registration page in Experience Workspaces. It’s disabled by default.
     * <p>Usage
     * If true, internal users log in to an Experience Cloud site from the site’s login page with their internal credentials. If they navigate to their internal org from the Experience Cloud site, they don't have to log in again.
     */
    global Boolean getAllowInternalUserLoginEnabled() { return false; }

    /**
     * Returns the AuthConfig sObject, which represents the authentication options for an Experience Cloud site or Salesforce My Domain subdomain.
     * @return The AuthConfig sObject for the Experience Cloud site or Salesforce My Domain subdomain.
     */
    global AuthConfig getAuthConfig() { return null; }

    /**
     * Returns the list of authentication providers configured for an Experience Cloud site or Salesforce My Domain subdomain.
     * @return A list of authentication providers (AuthConfigProviders sObjects), which are children of the AuthProvider sObject.
     */
    global List getAuthConfigProviders() { return null; }

    /**
     * Returns the single sign-on URL for an Experience Cloud site subdomain.
     * <p>Note
     * For better performance, we recommend using this method instead of getAuthProviderSsoUrl. If the authentication provider has User Subdomain for Callback enabled, changing the single sign-on URL also changes the callback URL to use the Experience Cloud site subdomain. Before switching to this method, update the callback URL in your third-party applications to avoid getting an invalid callback URL error during single sign-on.
     * @return The Single Sign-On Initialization URL for the Experience Cloud site subdomain.
     */
    global static String getAuthProviderSsoDomainUrl(String communityUrl, String startUrl, String developerName) { return null; }

    /**
     * Returns the single sign-on URL for an Experience Cloud site or Salesforce My Domain subdomain.
     * @return The Single Sign-On Initialization URL for the Experience Cloud site or Salesforce My Domain subdomain.
     */
    global static String getAuthProviderSsoUrl(String communityUrl, String startUrl, String developerName) { return null; }

    /**
     * Returns the list of authentication providers available for an Experience Cloud site or Salesforce My Domain subdomain.
     * @return A list of authentication providers (AuthProvider sObjects) for the Experience Cloud site or My Domain subdomain.
     */
    global List getAuthProviders() { return null; }

    /**
     * Returns the color for the background of the login page for a community.
     */
    global String getBackgroundColor() { return null; }

    /**
     * Returns true if certificate-based authentication is enabled for the My Domain URL.
     */
    global Boolean getCertificateLoginEnabled(String domainUrl) { return false; }

    /**
     * Returns the certificate-based authentication endpoint for the My Domain URL if the org has certificate-based authentication enabled.
     * @return The certificate-based authentication endpoint for the My Domain URL: mydomainURL:8443/services/certauth?startURL=startURLParam
     */
    global static String getCertificateLoginUrl(String domainUrl, String startUrl) { return null; }

    global Id getDefaultProfileForRegistration() { return null; }

    global Boolean getEmbeddedLoginEnabled() { return false; }

    /**
     * Returns the text at the bottom of the login page for a community.
     * @return The text string displayed at the bottom of the login page, for example “Log in with an existing account.”
     */
    global String getFooterText() { return null; }

    /**
     * Returns the URL for the standard or custom Forgot Password page that is specified for an Experience Cloud site or portal by the administrator.
     * @return URL for the standard or custom Forgot Password page.
     */
    global String getForgotPasswordUrl() { return null; }

    /**
     * Returns true if the Headless Forgot Password Flow is enabled.
     */
    global Boolean getHeadlessForgotPasswordEnabled() { return false; }

    /**
     * This method will be deprecated in a future release. Use the getHeadlessForgotPasswordEnabled() method in this class instead.
     */
    @Deprecated
    global Boolean getHeadlessFrgtPswEnabled() { return false; }

    /**
     * Determines if headless passwordless login is enabled.
     * @return Returns true if headless passwordless login is enabled.
     */
    global Boolean getHeadlessPasswordlessLoginEnabled() { return false; }

    /**
     * Determines if the Headless Registration Flow is enabled.
     * @return Returns true if headless registration is enabled.
     */
    global Boolean getHeadlessRegistrationEnabled() { return false; }

    /**
     * Returns the URL for the right-frame content to display on the right side of the Experience Cloud site login page. The admin supplies the URL.
     * <p>URL for the right-frame content of the Experience Cloud site login page. Salesforce creates an inline (iframe) on the right side of the login page to display the contents specified by the URL.
     */
    global String getLoginRightFrameUrl() { return null; }

    /**
     * Returns the location of the icon image at the bottom of the login page for a community.
     * @return The path to the icon image.
     */
    global String getLogoUrl() { return null; }

    /**
     * Returns the list of SAML-based authentication providers available for an Experience Cloud site or Salesforce My Domain subdomain.
     * @return A list of SAML-based authentication providers, which are SamlSsoConfig sObjects.
     */
    global List getSamlProviders() { return null; }

    /**
     * Returns the single sign-on URL for an Experience Cloud site or Salesforce My Domain subdomain.
     * @return The Single Sign-On Initialization URL for the Experience Cloud site or Salesforce My Domain subdomain.
     */
    global static String getSamlSsoUrl(String cUrl, String startUrl, String samlId) { return null; }

    /**
     * Indicates whether the current community allows new users to create their own account by filling out a registration form.
     */
    global Boolean getSelfRegistrationEnabled() { return false; }

    /**
     * Returns the location of the self-registration page for new users to sign up for an account with a community.
     * @return The location of the self-registration page.
     */
    global String getSelfRegistrationUrl() { return null; }

    /**
     * Returns the start page of an Experience Cloud site or Salesforce My Domain subdomain. This URL is the first page that users see when they log in.
     * @return The location of the start page for the Experience Cloud site or My Domain subdomain.
     */
    global String getStartUrl() { return null; }

    /**
     * Indicates whether the current community is set to display a login form asking for a username and password. You can configure the community not to request a username and password if it is for unauthenticated users or users logging in with a third-party authentication provider.
     */
    global Boolean getUsernamePasswordEnabled() { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the Experience Cloud site uses Site.com pages; otherwise, returns false.
     */
    global Boolean isCommunityUsingSiteAsContainer() { return false; }

    global override virtual String toString() { return null; }
}