/**
 * Criteria for the new members type of custom recommendation audience.
 */
global class NewUserAudienceCriteria extends ConnectApi.AudienceCriteria {

  /**
   * The maximum number of days since a user became a site member.
   */
  global Double maxDaysInCommunity;

}