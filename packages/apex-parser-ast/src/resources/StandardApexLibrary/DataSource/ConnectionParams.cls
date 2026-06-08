/**
 * Contains the credentials for authenticating to the external system.
 */
global class ConnectionParams {

  global ConnectionParams() {}

  public String certificateName;

  public String endpoint;

  public String oauthToken;

  public String password;

  public DataSource.IdentityType principalType;

  public DataSource.AuthenticationProtocol protocol;

  public String repository;

  public String username;

  global Object clone() {}

}