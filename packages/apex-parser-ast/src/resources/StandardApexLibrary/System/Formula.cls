/**
 * Contains methods to get a builder for creating a formula instance and to update all formula fields on the input SObjects.
 */
global class Formula {

  public static formulaeval.FormulaBuilder builder() {}

  /**
   * Updates (recalculates) all formula fields on the input SObjects .
   * @param sobjects List of sObjects whose formula fields are to be recalculated.
   * @return List<System.FormulaRecalcResult>
   */
  public static List<System.FormulaRecalcResult> recalculateFormulas(List<SObject> sobjects) {}

}