/**
 * A recommended fulfillment location for a specific SKU, including available quantity and score.
 */
global class BestLocationPerSKUOutputRepresentation {

  global BestLocationPerSKUOutputRepresentation() {}

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * The location's ID.
   */
  global String locationId;

  /**
   * The quantity available to order at this location.
   */
  global Integer quantityAvailableToOrder;

  /**
   * Indicates whether the request succeeded.
   */
  global Boolean success;

  /**
   * The score for this SKU at this location.
   */
  global Double unitScore;

  global Object clone() {}

}