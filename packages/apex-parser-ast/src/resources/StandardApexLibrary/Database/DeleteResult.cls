/**
 * Represents the result of a delete DML operation returned by the Database.delete method.
 * Usage
 * An array of Database.DeleteResult objects is returned with the delete database method. Each element in the DeleteResult array corresponds to the sObject array passed as the sObject[] parameter in the delete Database method; that is, the first element in the DeleteResult array matches the first element passed in the sObject array, the second element corresponds with the second element, and so on. If only one sObject is passed in, the DeleteResult array contains a single element.
 * Example
 * The following example shows how to obtain and iterate through the returned Database.DeleteResult objects. It deletes some queried accounts using Database.delete with a false second parameter to allow partial processing of records on failure. Next, it iterates through the results to determine whether the operation was successful or not for each record. It writes the ID of every record that was processed successfully to the debug log, or error messages and fields of the failed records.
 * // Query the accounts to delete
 * Account[] accts = [SELECT Id from Account WHERE Name LIKE 'Acme%'];
 * // Delete the accounts
 * Database.DeleteResult[] drList = Database.delete(accts, false);
 *
 * // Iterate through each returned result
 * for(Database.DeleteResult dr : drList) {
 *     if (dr.isSuccess()) {
 *         // Operation was successful, so get the ID of the record that was processed
 *         System.debug('Successfully deleted account with ID: ' + dr.getId());
 *     }
 *     else {
 *         // Operation failed, so get all errors
 *         for(Database.Error err : dr.getErrors()) {
 *             System.debug('The following error has occurred.');
 *             System.debug(err.getStatusCode() + ': ' + err.getMessage());
 *             System.debug('Account fields that affected this error: ' + err.getFields());
 *         }
 *     }
 * }
 */
global class DeleteResult {
    global List errors { get; }
    global Id id { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * If an error occurred, returns an array of one or more database error objects providing the error code and description. If no error occurred, returns an empty set.
     */
    global List getErrors() { return null; }

    /**
     * Returns the ID of the sObject you were trying to delete.
     */
    global Id getId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * A Boolean value that is set to true if the DML operation was successful for this object, false otherwise.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}