/**
 * Contains methods to build and validate user-defined formulas.
 * <p>Usage
 * The context type that corresponds to the Apex class used in the builder withType() method must be a global, user-defined Apex class. Any fields or properties that the formula references must also be global.
 */
global class FormulaBuilder {
    /**
     * Validates and returns the formula instance created using the FormulaBuilder methods.
     * @return Returns an instance of the FormulaInstance object. If the formula validation such as field references, functions, or syntax, fails, the method throws a FormulaValidationException exception.
     */
    global formulaeval.FormulaInstance build() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Optional. Indicates whether a formula expression created with the build() method is evaluated in template mode. In template mode, values are interpolated into a string by using merge field syntax rather than by concatenating strings with the & operator. Merge fields use the syntax {!Object_Name.Field_Name}, where names are preceded by an exclamation mark and enclosed in curly braces.
     * <p>Usage
     * In template mode, the FormulaEval.FormulaReturnType value that’s set with withReturnType() must be STRING.
     * Template mode supports the same global variables, formula expressions, and context types as non-template mode, as long as they are correctly set using the FormulaBuilder methods.
     * <p>Example
     * In this example, true is passed to parseAsTemplate(). The formula expression is evaluated in template mode, so the values of the name and website fields on the Account record are interpolated into the string using merge field syntax. The output is equal to the expression 'name & " (" & website & ")"'.
     * FormulaEval.FormulaInstance ff = Formula.builder()
     *     .withType(Schema.Account.class)
     *     .withReturnType(FormulaEval.FormulaReturnType.STRING)
     *     .withFormula('{!name} ({!website})')
     *     .parseAsTemplate(true)
     *     .build();
     */
    global formulaeval.FormulaBuilder parseAsTemplate(Boolean templateMode) { return null; }

    global override virtual String toString() { return null; }

    /**
     * Optional. Indicates whether a null for a numeric data type is treated as zero while evaluating the formula with the build() method.
     */
    global formulaeval.FormulaBuilder treatNumericNullAsZero(Boolean treatNumericNullAsZero) { return null; }

    /**
     * Required. Sets the formula expression that the build() method uses to create the formula instance.
     */
    global formulaeval.FormulaBuilder withFormula(String formulaText) { return null; }

    /**
     * Optional. Sets the list of global variables that can be referenced in the formula expression created with the build() method.
     */
    global formulaeval.FormulaBuilder withGlobalVariables(List formulaGlobals) { return null; }

    /**
     * Required. Sets the formula output data type for the formula instance created with the build() method.
     */
    global formulaeval.FormulaBuilder withReturnType(formulaeval.FormulaReturnType returnType) { return null; }

    /**
     * Sets the Apex type that corresponds to the Apex class used with the build() method to SObject type.
     * <p>Example
     * This example uses an SObject type as an input in the withType() method to build and evaluate a formula.
     * FormulaEval.FormulaInstance ff = Formula.builder()
     *     .withReturnType(FormulaEval.FormulaReturnType.Boolean)
     *     .withType(Account.SObjectType)
     *     .withFormula('ISBLANK(Site)')
     *     .build();
     *
     * Boolean siteIsBlank = (Boolean)ff.evaluate(new Account(Site='Test'));
     * Assert.isFalse(siteIsBlank);
     */
    global formulaeval.FormulaBuilder withType(Schema.SObjectType contextToken) { return null; }

    /**
     * Sets the Apex type that corresponds to the Apex class used with the build() method.
     */
    global formulaeval.FormulaBuilder withType(System.Type contextType) { return null; }
}