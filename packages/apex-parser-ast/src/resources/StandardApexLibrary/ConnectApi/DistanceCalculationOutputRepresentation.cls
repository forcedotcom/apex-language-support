/**
 * Shipping distance data for a set of inventory locations.
 */
global class DistanceCalculationOutputRepresentation {

  /**
   * The average distance from the locations to the order recipient.
   */
  global Double averageDistance;

  /**
   * The list of locations and their distances to the order recipient.
   */
  global List < ConnectApi.LocationOutputRepresentation > locations;

  /**
   * This result’s rank among all results by average distance to the order recipient.
   */
  global Integer rank;

}