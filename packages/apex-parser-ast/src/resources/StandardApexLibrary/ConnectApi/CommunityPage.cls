/**
 * Page of Experience Cloud sites.
 */
global class CommunityPage {

  /**
   * List of Experience Cloud sites the context user has access to.
   */
  global List < ConnectApi.Community > communities;

  /**
   * Total number of Experience Cloud sites.
   */
  global Integer total;

}