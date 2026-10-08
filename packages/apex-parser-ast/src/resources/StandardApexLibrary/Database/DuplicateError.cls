/**
 * Contains information about an error that occurred when an attempt was made to save a duplicate record. Use if your organization has set up duplicate rules, which are part of the Duplicate Management feature.
 * Example
 * When you try to save a record that’s identified as a duplicate record by a duplicate rule, you’ll receive a duplicate error. If the duplicate rule contains the Allow action, an attempt will be made to bypass the error.
 * // Try to save a duplicate account
 * Account duplicateAccount = new Account(Name='Acme',  BillingCity='San Francisco');
 * Database.SaveResult sr = Database.insert(duplicateAccount, false);
 * if (!sr.isSuccess()) {
 *
 * 	// Insertion failed due to duplicate detected
 * 	for(Database.Error duplicateError : sr.getErrors()){
 * 		Datacloud.DuplicateResult duplicateResult =
 *                   ((Database.DuplicateError)duplicateError).getDuplicateResult();
 * 		System.debug('Duplicate records have been detected by ' +
 *                   duplicateResult.getDuplicateRule());
 * 		System.debug(duplicateResult.getErrorMessage());
 * 	}
 *
 * 	// If the duplicate rule is an alert rule, we can try to bypass it
 * 	Database.DMLOptions dml = new Database.DMLOptions();
 * 	dml.DuplicateRuleHeader.AllowSave = true;
 * 	Database.SaveResult sr2 = Database.insert(duplicateAccount, dml);
 * 	if (sr2.isSuccess()) {
 * 		System.debug('Duplicate account has been inserted in Salesforce!');
 * 	}
 * }
 */
global class DuplicateError extends Database.Error {
    global Datacloud.DuplicateResult duplicateresult { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the details of a duplicate rule and duplicate records found by the duplicate rule.
     * Example
     * This example shows the code used to get the possible duplicates and related match information after saving a new contact. This code is part of a custom application that implements duplicate management when users add a contact. See DuplicateResult Class to check out the entire sample applicaton.
     * Datacloud.DuplicateResult duplicateResult =
     *                             duplicateError.getDuplicateResult();
     */
    global Datacloud.DuplicateResult getDuplicateResult() { return null; }

    /**
     * Returns an array of one or more field names. Identifies which fields in the object, if any, affected the error condition.
     */
    global List getFields() { return null; }

    /**
     * Returns the error message text.
     */
    global String getMessage() { return null; }

    global System.StatusCode getStatusCode() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}