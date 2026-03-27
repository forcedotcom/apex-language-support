/**
 * Contains the credentials for authenticating to the external system.
 */
global class ConnectionParams {

  global String certificateName;

  global String endpoint;

  global String oauthToken;

  global String password;

  global DataSource.IdentityType principalType;

  global DataSource.AuthenticationProtocol protocol;

  global String repository;

  global String username;

}