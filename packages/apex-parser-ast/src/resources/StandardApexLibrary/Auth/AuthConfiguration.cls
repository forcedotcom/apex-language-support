/**
 * Contains methods for configuring settings for users to log in to a Salesforce org using their authentication provider credentials instead of their Salesforce credentials. The authentication provider can be any authentication provider that supports the OpenID Connect protocol, such as Google, Facebook, or Twitter. Users log in to either an Experience Cloud site ( https:// MyDomainName .my.site.com ) or your My Domain login URL ( https:// MyDomainName .my.salesforce.com ).
 */
global class AuthConfiguration {

  global AuthConfiguration(String communityOrCustomUrl, String startUrl) {}

  /**
   * Indicates whether the Experience Cloud site allows internal users to log in using the Experience Cloud site login page. To enable, admins configure the setting Allow internal users to log in directly to the experience on the Login & Registration page in Experience Workspaces. It’s disabled by default.
   * @return Boolean
   */
  global Boolean getAllowInternalUserLoginEnabled() {}

  /**
   * Returns the AuthConfig sObject, which represents the authentication options for an Experience Cloud site or Salesforce My Domain subdomain.
   * @return AuthConfig
   */
  global AuthConfig getAuthConfig() {}

  /**
   * Returns the list of authentication providers configured for an Experience Cloud site or Salesforce My Domain subdomain.
   * @return List<AuthConfigProviders>
   */
  global List<AuthConfigProviders> getAuthConfigProviders() {}

  /**
   * Returns the list of authentication providers available for an Experience Cloud site or Salesforce My Domain subdomain.
   * @return List<AuthProvider>
   */
  global List<AuthProvider> getAuthProviders() {}

  /**
   * Returns the single sign-on URL for an Experience Cloud site subdomain.
   * @param communityUrl The URL for the Experience Cloud site subdomain. If null or specified as an empty string, you get the single sign-on URL for the org’s My Domain.
   * @param startUrl The page that users see after logging in to the Experience Cloud site subdomain.
   * @param developerName The unique name of the authentication provider.
   * @return String
   */
  global static String getAuthProviderSsoDomainUrl(String communityUrl, String startUrl, String developerName) {}

  /**
   * Returns the single sign-on URL for an Experience Cloud site or Salesforce My Domain subdomain.
   * @param communityUrl The URL for the Experience Cloud site or My Domain subdomain. If not null and not specified as an empty string, you get the URL for the Experience Cloud site. If null or specified as an empty string, you get the URL for a custom domain.
   * @param startUrl The page that users see after logging in to the Experience Cloud site or My Domain subdomain.
   * @param developerName The unique name of the authentication provider.
   * @return String
   */
  global static String getAuthProviderSsoUrl(String communityUrl, String startUrl, String developerName) {}

  /**
   * Returns the color for the background of the login page for a community.
   * @return String
   */
  global String getBackgroundColor() {}

  /**
   * Returns true if certificate-based authentication is enabled for the My Domain URL.
   * @param domainUrl The My Domain URL that is being checked for certificate-based authentication.
   * @return Boolean
   */
  global Boolean getCertificateLoginEnabled(String domainUrl) {}

  /**
   * Returns the certificate-based authentication endpoint for the My Domain URL if the org has certificate-based authentication enabled.
   * @param domainUrl The My Domain URL being checked for its certificate-based authentication endpoint .
   * @param startUrl The page that the user is directed to after logging in to the My Domain with certificate-based authentication.
   * @return String
   */
  global static String getCertificateLoginUrl(String domainUrl, String startUrl) {}

  /**
   * Returns the profile ID assigned to new community users.
   * @return String
   */
  global String getDefaultProfileForRegistration() {}

  /**
   * Returns the text at the bottom of the login page for a community.
   * @return String
   */
  global String getFooterText() {}

  /**
   * Returns the URL for the standard or custom Forgot Password page that is specified for an Experience Cloud site or portal by the administrator.
   * @return String
   */
  global String getForgotPasswordUrl() {}

  global Boolean getHeadlessForgotPasswordEnabled() {}

  global Boolean getHeadlessFrgtPswEnabled() {}

  global Boolean getHeadlessPasswordlessLoginEnabled() {}

  global Boolean getHeadlessRegistrationEnabled() {}

  /**
   * Returns the location of the icon image at the bottom of the login page for a community.
   * @return String
   */
  global String getLogoUrl() {}

  global String getLoginRightFrameUrl() {}

  /**
   * Returns the list of SAML-based authentication providers available for an Experience Cloud site or Salesforce My Domain subdomain.
   * @return List<SamlSsoConfig>
   */
  global List<SamlSsoConfig> getSamlProviders() {}

  /**
   * Returns the single sign-on URL for an Experience Cloud site or Salesforce My Domain subdomain.
   * @param communityUrl The URL for the Experience Cloud site or My Domain subdomain. If not null and not specified as an empty string, you get the URL for the Experience Cloud site. If null or specified as an empty string, you get the URL for a My Domain subdomain.
   * @param startURL 
   * @param samlId The unique identifier of the SamlSsoConfig standard object for the Experience Cloud site or My Domain subdomain
   * @return String
   */
  global static String getSamlSsoUrl(String communityUrl, String startURL, String samlId) {}

  /**
   * Indicates whether the current community allows new users to create their own account by filling out a registration form.
   * @return Boolean
   */
  global Boolean getSelfRegistrationEnabled() {}

  /**
   * Returns the location of the self-registration page for new users to sign up for an account with a community.
   * @return String
   */
  global String getSelfRegistrationUrl() {}

  /**
   * Returns the start page of an Experience Cloud site or Salesforce My Domain subdomain. This URL is the first page that users see when they log in.
   * @return String
   */
  global String getStartUrl() {}

  /**
   * Indicates whether the current community is set to display a login form asking for a username and password. You can configure the community not to request a username and password if it is for unauthenticated users or users logging in with a third-party authentication provider.
   * @return Boolean
   */
  global Boolean getUsernamePasswordEnabled() {}

  /**
   * Returns true if the Experience Cloud site uses Site.com pages; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isCommunityUsingSiteAsContainer() {}

  global Object clone() {}

  global Boolean getEmbeddedLoginEnabled() {}

}