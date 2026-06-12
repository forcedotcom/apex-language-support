/**
 * Field value.
 */
global class RecordFieldValue {

  global RecordFieldValue() {}

  /**
   * Field display value.
   */
  global String displayValue;

  /**
   * Represents field highlighting in the results.
   */
  global String highlight;

  /**
   * Field raw value.
   */
  global Object value;

  global Object clone() {}

}