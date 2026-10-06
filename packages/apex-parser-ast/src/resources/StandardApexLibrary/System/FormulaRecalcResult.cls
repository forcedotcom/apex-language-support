/**
 * The return type of the Formula.recalculateFormulas method.
 * Usage
 * Indicates the result and status of recalculating formulas on a single sObject. Holds a reference to the sObject and a list of all the fields that were recalculated.
 * Example
 * This example assumes that you have a formula field called divide__c with formula “1 / LEN(Name).
 * List<Account> accounts = [SELECT Name FROM Account WHERE Name='Acme'];
 * accounts[0].Name = '';
 * List<FormulaRecalcResult> results = Formula.recalculateFormulas(accounts);
 * FormulaRecalcResult result0 = results[0];
 * FormulaRecalcFieldError fieldError = result0.getErrors()[0];
 * System.debug(fieldError.getFieldName()); // 'divide'
 * System.debug(fieldError.getFieldError()); // 'Division by zero'
 */
global class FormulaRecalcResult {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * If an error occurs during formula recalculation, an array of one or more database error objects, along with error codes and descriptions, is returned.
     */
    global List getErrors() { return null; }

    /**
     * Returns the sObject with formulas recalculated.
     */
    global SObject getSObject() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns a Boolean value that is set to true if the formula recalculation process completed successfully; otherwise, it is set to false.
     */
    global Boolean isSuccess() { return false; }

    global override virtual String toString() { return null; }
}