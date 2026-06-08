/**
 * Wraps inventory location shipping distance calculation results.
 */
global class AverageDistanceResultOutputRepresentation {

  global AverageDistanceResultOutputRepresentation() {}

  /**
   * Results of the shipping distance calculations.
   */
  global ConnectApi.DistanceCalculationOutputRepresentation distanceCalculation;

  global Object clone() {}

}