/**
 * Rule that restricts the quantity of a product that can be purchased.
 */
global class PurchaseQuantityRule {

  global PurchaseQuantityRule() {}

  /**
   * Increment value of the quantity that can be purchased.
   */
  global String increment;

  /**
   * Maximum quantity that can be purchased.
   */
  global String maximum;

  /**
   * Minimum quantity that can be purchased.
   */
  global String minimum;

  global Object clone() {}

}