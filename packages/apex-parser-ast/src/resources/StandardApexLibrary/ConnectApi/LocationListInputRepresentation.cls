/**
 * A list of location identifiers used to specify locations excluded from routing consideration.
 */
global class LocationListInputRepresentation {

  global LocationListInputRepresentation() {}

  /**
   * The list of location identifiers to exclude. Don't leave any identifier blank. The list can contain up to 100 items.
   */
  global List < String > locations;

  global Object clone() {}

}