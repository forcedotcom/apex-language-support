/**
 * The results of calculating the average distances from sets of inventory locations to an order recipient.
 */
global class RankAverageDistanceOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * The specified unit of distance (miles or kilometers).
   */
  global String distanceUnit;

  /**
   * The results of the shipping distance calculations.
   */
  global List < ConnectApi.AverageDistanceResultOutputRepresentation > results;

}