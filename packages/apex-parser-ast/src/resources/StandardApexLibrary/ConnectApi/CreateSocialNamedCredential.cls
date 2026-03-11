/**
 * Result of a creating a named credential for a social external channel.
 */
global class CreateSocialNamedCredential {

  /**
   * Authentication URL.
   */
  global String authUrl;

  /**
   * Developer name of the external credential.
   */
  global String externalCredentialDeveloperName;

  /**
   * Developer name of the named credential.
   */
  global String namedCredentialDeveloperName;

  /**
   * Status response specifiying whether the Webstore Meta Config entity was successfully created.
   */
  global ConnectApi.SocialStatusRepresentation status;

}