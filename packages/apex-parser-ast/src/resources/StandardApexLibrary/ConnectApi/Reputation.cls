/**
 * Reputation for a user.
 */
global class Reputation {

  /**
   * User’s reputation level.
   */
  global ConnectApi.ReputationLevel reputationLevel;

  /**
   * User's reputation points, which can be earned by performing different activities.
   */
  global Double reputationPoints;

  /**
   * Connect REST API URL to the reputation.
   */
  global String url;

}