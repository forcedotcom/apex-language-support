/**
 * A paginated list of ConnectApi.GroupRecord objects.
 */
global class GroupRecordPage {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * List of records on the current page.
   */
  global List < ConnectApi.GroupRecord > records;

  /**
   * Total number of records associated with the group.
   */
  global Integer totalRecordCount;

}