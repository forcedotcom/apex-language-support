/**
 * Date estimation for product delivery.
 */
global class DateEstimationOutputRepresentation {

  global DateEstimationOutputRepresentation() {}

  /**
   * Maximum estimated date for delivery.
   */
  global String max;

  /**
   * Minimum estimated date for delivery.
   */
  global String min;

  /**
   * Estimation type.
   */
  global String type;

  global Object clone() {}

}