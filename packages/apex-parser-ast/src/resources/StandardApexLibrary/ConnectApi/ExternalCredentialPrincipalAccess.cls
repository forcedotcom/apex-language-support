/**
 * External credential principal access.
 */
global class ExternalCredentialPrincipalAccess {

  /**
   * Developer name of the associated access entity.
   */
  global String developerName;

  /**
   * ID of the associated access entity.
   */
  global String id;

  /**
   * Access type of the external credential principal. Values are: PermissionSet PermissionSetGroup Profile
   */
  global ConnectApi.ExternalCredentialPrincipalAccessType type;

}