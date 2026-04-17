/**
 * External auth identity provider input.
 */
global class ExternalAuthIdentityProviderInput {

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
   * Client authentication method that describes how credentials are sent to the authorization server. Values are: ClientSecretBasic ClientSecretPost The default value is ClientSecretBasic .
   */
  global ConnectApi.IdentityProviderClientAuth clientAuthentication;

  /**
   * Description of the external auth identity provider.
   */
  global String description;

  /**
   * Full name of the external auth identity provider. The full name can include a namespace prefix.
   */
  global String fullName;

  /**
   * External auth identity provider label.
   */
  global String label;

  /**
   * List of custom request parameters to customize and extend requests to the identity provider’s token endpoint.
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
   * User info URL to retrieve user profile information from the external system. Applicable only when the authenticationProtocol is OAuth .
   */
  global String userInfoUrl;

}