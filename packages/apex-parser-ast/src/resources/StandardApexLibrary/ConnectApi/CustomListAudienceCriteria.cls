/**
 * Criteria for the custom list type of custom recommendation audience.
 */
global class CustomListAudienceCriteria {

  /**
   * Total number of members in the custom recommendation audience.
   */
  global Integer memberCount;

  /**
   * Members of the custom recommendation audience.
   */
  global ConnectApi.UserReferencePage members;

}