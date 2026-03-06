/**
 * The details of an item type associated with a repository folder.
 */
global class ContentHubItemTypeDetail {

  /**
   * A list of fields that the context user is allowed to set in the metadata of this item type.
   */
  global List < ConnectApi.ContentHubFieldDefinition > fields;

}