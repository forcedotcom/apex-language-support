/**
 * Contains methods to build and validate user-defined formulas.
 */
global class FormulaBuilder {

  global FormulaBuilder() {}

  global FormulaEval.FormulaInstance build() {}

  global formulaeval.FormulaBuilder parseAsTemplate(Boolean templateMode) {}

  global FormulaEval.FormulaBuilder treatNumericNullAsZero(Boolean isNumericNullZero) {}

  global FormulaEval.FormulaBuilder withFormula(String formulaText) {}

  global FormulaEval.FormulaBuilder withGlobalVariables(List<formulaeval.FormulaGlobal> formulaGlobals) {}

  global FormulaEval.FormulaBuilder withReturnType(formulaeval.FormulaReturnType returnType) {}

  global formulaeval.FormulaBuilder withType(System.Type contextType) {}

  global formulaeval.FormulaBuilder withType(Schema.SObjectType contextSObjectType) {}

  global Object clone() {}

}