/**
 * Order summary product attribute representation.
 */
global class OrderSummaryProductAttribute {

  global OrderSummaryProductAttribute() {}

  /**
   * Label or display name of the attribute.
   */
  global String label;

  /**
   * Sequence of the attribute set with regard to the product.
   */
  global Integer sequence;

  /**
   * Display value of the attribute.
   */
  global String value;

  global Object clone() {}

}