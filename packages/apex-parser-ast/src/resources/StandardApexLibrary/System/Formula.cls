/**
 * Contains methods to get a builder for creating a formula instance and to update all formula fields on the input SObjects.
 * <p>Usage
 * Use the Formula class in conjunction with the FormulaBuilder and FormulaInstance classes in the FormulaEval namespace.
 * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_formulaeval.htm" target="_blank" title="HTML (New Window)">Formula Evaluation in Apex</a>.
 * <p>Example
 * This example creates a formula instance using Formula.builder() and the FormulaBuilder methods.
 * FormulaEval.FormulaInstance ff = Formula.builder()
 *     .withType(Account.SObjectType)
 *     .withReturnType(FormulaEval.FormulaReturnType.STRING)
 *     .withFormula('{!name} ({!website})')
 *     .parseAsTemplate(true)
 *     .build();
 */
global class Formula {
    global Object Formula() { return null; }

    /**
     * Creates an instance of FormulaBuilder for configuring the formula with formula expression, context type, and output data type as inputs.
     */
    global static formulaeval.FormulaBuilder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Updates (recalculates) all formula fields on the input SObjects.
     * <p>Usage
     * Recalculate formula fields on new or queried SObjects. If all data is present on the SObjects, SOQL limits are not affected. If the data required to evaluate a formula field is missing, that data is retrieved and limits are changed accordingly.
     * The new formula values are stored in the SObjects themselves and overwrite previous values of formula fields.
     * <p>Example
     * Account a = new Account();
     * a.Name = 'Salesforce';
     * a.BillingCity = 'San Francisco';
     * List<Account> accounts = new List<Account>{a};
     *
     * List<FormulaRecalcResult> results = Formula.recalculateFormulas(accounts);
     * System.assert(results[0].isSuccess());
     * // Option 1
     * System.debug('New value: ' + accounts[0].get('My_Formula_Field__c'));
     * // Option 2
     * System.debug('New value: ' + results[0].getSObject().get(‘My_Formula_Field__c’));
     */
    global static List recalculateFormulas(List sobjects) { return null; }

    global override virtual String toString() { return null; }
}