/**
 * External auth identity provider.
 */
global class ExternalAuthIdentityProvider {

  /**
   * Authentication flow to get tokens to call protected APIs. Values are: AuthorizationCode
   */
  global ConnectApi.IdentityProviderAuthFlow authenticationFlow;

  /**
   * Authentication protocol required to access the external system. Values are: OAuth
   */
  global ConnectApi.IdentityProviderAuthProtocol authenticationProtocol;

  /**
   * Authorization endpoint URL for the external system.
   */
  global String authorizeUrl;

  /**
   * For the Authorization Code authentication flow, the callback URL that's used by the external system after authorization.
   */
  global String callbackUrl;

  /**
   * Client authentication method that describes how credentials are sent to the authorization server. Values are: ClientSecretBasic ClientSecretPost
   */
  global ConnectApi.IdentityProviderClientAuth clientAuthentication;

  /**
   * Namespace of the package that created the external auth identity provider.
   */
  global String createdByNamespace;

  /**
   * List of the external auth identity provider credentials.
   */
  global List < ConnectApi.ExternalAuthIdentityProviderCredential > credentials;

  /**
   * Description of the external auth identity provider.
   */
  global String description;

  /**
   * Full name of the external auth identity provider. The full name can include a namespace prefix.
   */
  global String fullName;

  /**
   * External auth identity provider ID.
   */
  global String id;

  /**
   * External auth identity provider label.
   */
  global String label;

  /**
   * List of custom request parameters.
   */
  global List < ConnectApi.ExternalAuthIdentityProviderParameter > parameters;

  /**
   * Reference to a standard external auth identity provider.
   */
  global String standardExternalIdentityProvider;

  /**
   * Token endpoint URL to retrieve tokens from the external system. Required for all OAuth 2.0 authentication flows.
   */
  global String tokenUrl;

  /**
   * Connect REST API URL for the external auth identity provider.
   */
  global String url;

  /**
   * User info URL to retrieve user profile information from the external system.
   */
  global String userInfoUrl;

}