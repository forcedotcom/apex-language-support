/**
 * Response for a Webstore Meta Config creation request.
 */
global class CreateWebStoreMetaConfiguration {

  /**
   * Specifies whether the Webstore Meta Config entity was successfully created ( true ) or not ( false ).
   */
  global ConnectApi.SocialStatusRepresentation status;

  /**
   * Details of a webstore Meta configuration.
   */
  global ConnectApi.WebStoreMetaConfig webStoreMetaConfig;

}