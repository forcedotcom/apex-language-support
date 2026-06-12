/**
 * The return type of the FormulaRecalcResult.getErrors method.
 */
global class FormulaRecalcFieldError {

  global FormulaRecalcFieldError() {}

  /**
   * Returns a message describing the errors encountered during formula recalculation.
   * @return String
   */
  global String getFieldError() {}

  /**
   * Returns the name of the formula recalculation error field.
   * @return String
   */
  global String getFieldName() {}

  global Object clone() {}

}