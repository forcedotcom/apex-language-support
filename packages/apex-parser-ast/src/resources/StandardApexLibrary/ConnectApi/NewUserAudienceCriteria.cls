/**
 * Criteria for the new members type of custom recommendation audience.
 */
global class NewUserAudienceCriteria extends ConnectApi.AudienceCriteria {

  global NewUserAudienceCriteria() {}

  /**
   * The maximum number of days since a user became a site member.
   */
  global Double maxDaysInCommunity;

  global Object clone() {}

}