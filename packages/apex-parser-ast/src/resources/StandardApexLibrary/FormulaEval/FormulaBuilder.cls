/**
 * Contains methods to build and validate user-defined formulas.
 */
global class FormulaBuilder {

  public FormulaEval.FormulaInstance build() {}

  public formulaeval.FormulaBuilder parseAsTemplate(Boolean templateMode) {}

  public FormulaEval.FormulaBuilder treatNumericNullAsZero(Boolean isNumericNullZero) {}

  public FormulaEval.FormulaBuilder withFormula(String formulaText) {}

  public FormulaEval.FormulaBuilder withGlobalVariables(List<formulaeval.FormulaGlobal> formulaGlobals) {}

  public FormulaEval.FormulaBuilder withReturnType(formulaeval.FormulaReturnType returnType) {}

  public formulaeval.FormulaBuilder withType(System.Type contextType) {}

  public formulaeval.FormulaBuilder withType(Schema.SObjectType contextSObjectType) {}

}