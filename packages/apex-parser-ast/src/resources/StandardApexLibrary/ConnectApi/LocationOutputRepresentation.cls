/**
 * An inventory location’s distance to an order recipient.
 */
global class LocationOutputRepresentation {

  global LocationOutputRepresentation() {}

  /**
   * The distance from the location to the order recipient.
   */
  global Double distance;

  /**
   * The location identifier.
   */
  global String locationIdentifier;

  global Object clone() {}

}