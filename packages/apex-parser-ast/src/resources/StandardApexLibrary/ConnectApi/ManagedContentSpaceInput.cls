/**
 * Create a managed content space.
 */
global class ManagedContentSpaceInput {

  /**
   * API name of the managed content space.
   */
  global String apiName;

  /**
   * Default language of the managed content space.
   */
  global String defaultLanguage;

  /**
   * Description of the managed content space.
   */
  global String description;

  /**
   * Name of the managed content space.
   */
  global String name;

  /**
   * Type of managed content space. Values are: Content Marketing
   */
  global ConnectApi.ManagedContentSpaceType spaceType;

}