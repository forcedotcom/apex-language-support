/**
 * The item types that the context user is allowed to create in a repository folder.
 */
global class ContentHubAllowedItemTypeCollection {

  global ContentHubAllowedItemTypeCollection() {}

  /**
   * A collection of item types that the context user is allowed to create in a repository folder.
   */
  global List < ConnectApi.ContentHubItemTypeSummary > allowedItemTypes;

  global Object clone() {}

}