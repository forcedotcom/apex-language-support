/**
 * An order recipient’s geographic location and information about sets of inventory locations that can fulfill the order.
 */
global class RankAverageDistanceInputRepresentation {

  /**
   * The country code of the order recipient.
   */
  global String deliveryCountryCode;

  /**
   * The postal code of the order recipient.
   */
  global String deliveryPostalCode;

  /**
   * Specify mi or km to return average distances in miles or kilometers, respectively.
   */
  global String distanceUnit;

  /**
   * Specify ASC or DESC to rank the results by average shipping distance in ascending or descending order, respectively.
   */
  global String sortResult;

  /**
   * Each element is a set of inventory locations that can combine to fulfill the order.
   */
  global List < ConnectApi.TargetLocationInputRepresentation > targetLocations;

}