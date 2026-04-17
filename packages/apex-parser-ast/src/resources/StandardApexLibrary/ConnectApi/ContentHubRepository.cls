/**
 * A repository.
 */
global class ContentHubRepository extends ConnectApi.ActorWithId {

  /**
   * Repository authentication information.
   */
  global ConnectApi.ContentHubRepositoryAuthentication authentication;

  /**
   * Repository features.
   */
  global ConnectApi.ContentHubRepositoryFeatures features;

  /**
   * Repository label.
   */
  global String label;

  /**
   * Repository name.
   */
  global String name;

  /**
   * Repository provider type.
   */
  global ConnectApi.ContentHubProviderType providerType;

  /**
   * URL to the list of items in the repository root folder.
   */
  global String rootFolderItemsUrl;

}