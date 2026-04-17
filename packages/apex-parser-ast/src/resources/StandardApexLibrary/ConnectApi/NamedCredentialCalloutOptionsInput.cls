/**
 * Named credential callout options input.
 */
global class NamedCredentialCalloutOptionsInput {

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