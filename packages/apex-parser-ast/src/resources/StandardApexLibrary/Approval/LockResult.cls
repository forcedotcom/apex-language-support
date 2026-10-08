/**
 * The result of a record lock returned by a System.Approval.lock() method.
 * Usage
 * The System.Approval.lock() methods return Approval.LockResult objects. Each element in a LockResult array corresponds to an element in the ID or sObject array passed as a parameter to a lock method. The first element in the LockResult array corresponds to the first element in the ID or sObject array, the second element corresponds to the second element, and so on. If only one ID or sObject is passed in, the LockResult array contains a single element.
 * Example
 * The following example obtains and iterates through the returned Approval.LockResult objects. It locks some queried accounts using Approval.lock with a false second parameter to allow partial processing of records on failure. Next, it iterates through the results to determine whether the operation was successful for each record. It writes the ID of every record that was processed successfully to the debug log, or writes error messages and failed fields of the failed records.
 * // Query the accounts to lock
 * Account[] accts = [SELECT Id from Account WHERE Name LIKE 'Acme%'];
 * // Lock the accounts
 * Approval.LockResult[] lrList = Approval.lock(accts, false);
 *
 * // Iterate through each returned result
 * for(Approval.LockResult lr : lrList) {
 *     if (lr.isSuccess()) {
 *         // Operation was successful, so get the ID of the record that was processed
 *         System.debug('Successfully locked account with ID: ' + lr.getId());
 *     }
 *     else {
 *         // Operation failed, so get all errors
 *         for(Database.Error err : lr.getErrors()) {
 *             System.debug('The following error has occurred.');
 *             System.debug(err.getStatusCode() + ': ' + err.getMessage());
 *             System.debug('Account fields that affected this error: ' + err.getFields());
 *         }
 *     }
 * }
 */
global class LockResult {
    global List errors { get; }
    global Id id { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * If an error occurred, returns an array of one or more database error objects, providing the error code and description.
     */
    global List getErrors() { return null; }

    /**
     * Returns the ID of the sObject you are trying to lock.
     * Usage
     * If the field contains a value, the object was locked. If the field is empty, the operation was not successful.
     */
    global Id getId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * A Boolean value that is set to true if the lock operation is successful for this object, or false otherwise.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}