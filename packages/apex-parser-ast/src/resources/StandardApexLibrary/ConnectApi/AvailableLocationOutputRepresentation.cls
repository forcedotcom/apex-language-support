/**
 * A set of inventory locations that can combine to fulfill an order.
 */
global class AvailableLocationOutputRepresentation {

  global AvailableLocationOutputRepresentation() {}

  /**
   * A list of inventory locations.
   */
  global List < String > locations;

  global Object clone() {}

}