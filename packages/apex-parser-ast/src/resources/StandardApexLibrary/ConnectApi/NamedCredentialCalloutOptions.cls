/**
 * Named credential callout options.
 */
global class NamedCredentialCalloutOptions {

  /**
   * Specifies whether to allow merge fields in the HTTP body ( true ) or not ( false ).
   */
  global Boolean allowMergeFieldsInBody;

  /**
   * Specifies whether to allow merge fields in the HTTP header ( true ) or not ( false ).
   */
  global Boolean allowMergeFieldsInHeader;

  /**
   * Specifies whether to generate an authorization header ( true ) or not ( false ).
   */
  global Boolean generateAuthorizationHeader;

}