/**
 * Managed content space.
 */
global class ManagedContentSpace {

  /**
   * API name of the managed content space.
   */
  global String apiName;

  /**
   * ID of the user who created the managed content space.
   */
  global String createdBy;

  /**
   * Date when the managed content space was created.
   */
  global Datetime createdDate;

  /**
   * Default language of the managed content space.
   */
  global String defaultLanguage;

  /**
   * Description of the managed content space.
   */
  global String description;

  /**
   * Fully qualified name of the managed content space.
   */
  global String fullyQualifiedName;

  /**
   * ID of the managed content space.
   */
  global String id;

  /**
   * Specifies whether the space is enhanced ( true ) or not ( false ).
   */
  global Boolean isEnhancedSpace;

  /**
   * ID of the user who last modified the managed content space.
   */
  global String lastModifiedBy;

  /**
   * Date when the managed content space was last modified.
   */
  global Datetime lastModifiedDate;

  /**
   * Name of the managed content space.
   */
  global String name;

  /**
   * ID of the root folder of the managed content space.
   */
  global String rootFolderId;

  /**
   * Base type of the managed content space.
   */
  global ConnectApi.ManagedContentSpaceBaseType spaceType;

}