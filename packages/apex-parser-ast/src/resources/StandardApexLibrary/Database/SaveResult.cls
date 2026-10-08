/**
 * The result of an insert or update DML operation returned by a Database method.
 * Usage
 * An array of SaveResult objects is returned with the insert and update database methods. Each element in the SaveResult array corresponds to the sObject array passed as the sObject[] parameter in the Database method, that is, the first element in the SaveResult array matches the first element passed in the sObject array, the second element corresponds with the second element, and so on. If only one sObject is passed in, the SaveResult array contains a single element.
 * A SaveResult object is generated when a new or existing Salesforce record is saved.
 * Example
 * The following example shows how to obtain and iterate through the returned Database.SaveResult objects. It inserts two accounts using Database.insert with a false second parameter to allow partial processing of records on failure. One of the accounts is missing the Name required field, which causes a failure. Next, it iterates through the results to determine whether the operation was successful or not for each record. It writes the ID of every record that was processed successfully to the debug log, or error messages and fields of the failed records. This example generates one successful operation and one failure.
 * // Create two accounts, one of which is missing a required field
 * Account[] accts = new List<Account>{
 *     new Account(Name='Account1'),
 *     new Account()};
 * Database.SaveResult[] srList = Database.insert(accts, false);
 *
 * // Iterate through each returned result
 * for (Database.SaveResult sr : srList) {
 *     if (sr.isSuccess()) {
 *         // Operation was successful, so get the ID of the record that was processed
 *         System.debug('Successfully inserted account. Account ID: ' + sr.getId());
 *     }
 *     else {
 *         // Operation failed, so get all errors
 *         for(Database.Error err : sr.getErrors()) {
 *             System.debug('The following error has occurred.');
 *             System.debug(err.getStatusCode() + ': ' + err.getMessage());
 *             System.debug('Account fields that affected this error: ' + err.getFields());
 *         }
 *     }
 * }
 */
global class SaveResult {
    global List errors { get; }
    global Id id { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * If an error occurred, returns an array of one or more database error objects providing the error code and description. If no error occurred, returns an empty set.
     */
    global List getErrors() { return null; }

    /**
     * Returns the ID of the sObject you were trying to insert or update.
     * Versioned Behavior Changes
     * In API version 53.0 and later, the method returns the sObject ID. However, if record locking fails during the update operation, the method returns a null value.
     * In API version 52.0 and earlier, the method returned a null value if the record wasn’t updated successfully.
     */
    global Id getId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns a Boolean that is set to true if the DML operation was successful for this object, false otherwise.
     * Example
     * This example shows the code used to process duplicate records, which are detected when there is an unsuccessful save due to an error. This code is part of a custom application that implements duplicate management when users add a contact. See DuplicateResult Class to check out the entire sample applicaton.
     * if (!saveResult.isSuccess()) { ... }
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}