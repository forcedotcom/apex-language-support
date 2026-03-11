/**
 * Authentication information for a repository.
 */
global class ContentHubRepositoryAuthentication {

  /**
   * Depends on the authProtocol . NoAuthentication — null . Oauth —URL to start the OAuth flow. Password —URL to the authentication settings for external systems.
   */
  global String authFlowUrl;

  /**
   * Authentication protocol used for the repository. Values are: NoAuthentication —Repository doesn’t require authentication. Oauth —Repository uses OAuth authentication protocol. Password —Repository uses user name and password authentication protocol.
   */
  global ConnectApi.ContentHubAuthenticationProtocol authProtocol;

  /**
   * Specifies whether the user has credentials or the administrator configured the external data source to use the same set of credentials for every user ( true ). Otherwise, false .
   */
  global Boolean userHasAuthSettings;

}