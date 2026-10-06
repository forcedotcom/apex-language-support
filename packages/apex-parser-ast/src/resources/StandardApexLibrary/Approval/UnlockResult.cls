/**
 * The result of a record unlock, returned by a System.Approval.unlock() method.
 * Usage
 * The System.Approval.unlock() methods return Approval.UnlockResult objects. Each element in an UnlockResult array corresponds to an element in the ID or sObject array passed as a parameter to an unlock method. The first element in the UnlockResult array corresponds to the first element in the ID or sObject array, the second element corresponds to the second element, and so on. If only one ID or sObject is passed in, the UnlockResult array contains a single element.
 * Example
 * The following example shows how to obtain and iterate through the returned Approval.UnlockResult objects. It locks some queried accounts using Approval.unlock with a false second parameter to allow partial processing of records on failure. Next, it iterates through the results to determine whether the operation was successful for each record. It writes the ID of every record that was processed successfully to the debug log, or writes error messages and failed fields of the failed records.
 * // Query the accounts to unlock
 * Account[] accts = [SELECT Id from Account WHERE Name LIKE 'Acme%'];
 *
 * for(Account acct:accts) {
 *    // Create an approval request for the account
 *    Approval.ProcessSubmitRequest req1 =
 *            new Approval.ProcessSubmitRequest();
 *    req1.setComments('Submitting request for approval.');
 *    req1.setObjectId(acct.id);
 *
 *    // Submit the record to specific process and skip the criteria evaluation
 *    req1.setProcessDefinitionNameOrId('PTO_Request_Process');
 *    req1.setSkipEntryCriteria(true);
 *
 *    // Submit the approval request for the account
 *    Approval.ProcessResult result = Approval.process(req1);
 *
 *    // Verify the result
 *    System.assert(result.isSuccess());
 * }
 *
 * // Unlock the accounts
 * Approval.UnlockResult[] urList = Approval.unlock(accts, false);
 *
 * // Iterate through each returned result
 * for(Approval.UnlockResult ur : urList) {
 *     if (ur.isSuccess()) {
 *         // Operation was successful, so get the ID of the record that was processed
 *         System.debug('Successfully unlocked account with ID: ' + ur.getId());
 *     }
 *     else {
 *         // Operation failed, so get all errors
 *         for(Database.Error err : ur.getErrors()) {
 *             System.debug('The following error has occurred.');
 *             System.debug(err.getStatusCode() + ': ' + err.getMessage());
 *             System.debug('Account fields that affected this error: ' + err.getFields());
 *         }
 *     }
 * }
 */
global class UnlockResult {
    global List errors { get; }
    global Id id { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * If an error occurred, returns an array of one or more database error objects, providing the error code and description.
     */
    global List getErrors() { return null; }

    /**
     * Returns the ID of the sObject you are trying to unlock.
     * Usage
     * If the field contains a value, the object was unlocked. If the field is empty, the operation was not successfult.
     */
    global Id getId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * A Boolean value that is set to true if the unlock operation is successful for this object, or false otherwise.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}