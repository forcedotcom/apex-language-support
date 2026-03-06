/**
 * A list of user references.
 */
global class UserReferencePage {

  /**
   * URL to the current page.
   */
  global String currentPageUrl;

  /**
   * URL to the next page.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page.
   */
  global String previousPageUrl;

  /**
   * Number of users in the collection.
   */
  global Integer userCount;

  /**
   * A collection of user references.
   */
  global List < ConnectApi.Reference > users;

}