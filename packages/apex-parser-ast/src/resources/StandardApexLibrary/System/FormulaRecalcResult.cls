/**
 * The return type of the Formula.recalculateFormulas method.
 */
global class FormulaRecalcResult {

  global FormulaRecalcResult() {}

  /**
   * If an error occurs during formula recalculation, an array of one or more database error objects, along with error codes and descriptions, is returned.
   * @return List<System.FormulaRecalcFieldError>
   */
  global List<System.FormulaRecalcFieldError> getErrors() {}

  /**
   * Returns the sObject with formulas recalculated.
   * @return SObject
   */
  global SObject getSObject() {}

  /**
   * Returns a Boolean value that is set to true if the formula recalculation process completed successfully; otherwise, it is set to false .
   * @return Boolean
   */
  global Boolean isSuccess() {}

  global Object clone() {}

}