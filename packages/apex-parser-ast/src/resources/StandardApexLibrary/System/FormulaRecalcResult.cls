/**
 * The return type of the Formula.recalculateFormulas method.
 */
global class FormulaRecalcResult {

  /**
   * If an error occurs during formula recalculation, an array of one or more database error objects, along with error codes and descriptions, is returned.
   * @return List<System.FormulaRecalcFieldError>
   */
  public List<System.FormulaRecalcFieldError> getErrors() {}

  /**
   * Returns the sObject with formulas recalculated.
   * @return SObject
   */
  public SObject getSObject() {}

  /**
   * Returns a Boolean value that is set to true if the formula recalculation process completed successfully; otherwise, it is set to false .
   * @return Boolean
   */
  public Boolean isSuccess() {}

}