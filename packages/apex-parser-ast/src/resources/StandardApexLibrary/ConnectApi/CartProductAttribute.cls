/**
 * Product attribute for a cart item.
 */
global class CartProductAttribute {

  global CartProductAttribute() {}

  /**
   * Label or display name of the attribute.
   */
  global String label;

  /**
   * Sequence of the attribute within the attribute set.
   */
  global Integer sequence;

  /**
   * Display value of the attribute.
   */
  global String value;

  global Object clone() {}

}