/**
 * Use RemoteObjectController to access the standard Visualforce Remote Objects operations in your Remote Objects override methods.
 * Usage
 * RemoteObjectController is supported only for use within Remote Objects methods. See Overriding Default Remote Objects Operations in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.pages.meta/pages/pages_intro.htm" target="_blank" title="HTML (New Window)">Visualforce Developer’s Guide</a> for examples of how to use RemoteObjectController with your Visualforce pages.
 */
global class RemoteObjectController {
    global RemoteObjectController() { }

    /**
     * Create a record in the database.
     * @return The return value is a map that represents the result of the Remote Objects operation. What is returned depends on the results of the call.
     * Success: A map that contains a single element with the ID of the record created. For example, { id: 'recordId' }.
     * Failure: A map that contains a single element with the error message for the overall operation. For example, { error: 'errorMessage' }.
     */
    global static Map create(String type, Map fields) { return null; }

    /**
     * Delete records from the database.
     * @return The return value is a map that represents the result of the Remote Objects operation. What is returned depends on how the method was called and the results of the call.
     * Single Delete—Success: A map that contains a single element with the ID of the record that was deleted. For example, { id: 'recordId' }.
     * Batch Delete—Success: A map that contains a single element, an array of Map<String,Object> elements. Each element contains the ID of a record that was deleted and an array of errors, if there were any, for that record’s individual delete. For example, { results: [ { id: 'recordId', errors: ['errorMessage', ...]}, ...] }.
     * Single and Batch Delete—Failure: A map that contains a single element with the error message for the overall operation. For example, { error: 'errorMessage' }.
     */
    global static Map del(String type, List ids) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Retrieve records from the database.
     * @return The return value is a map that represents the result of the Remote Objects operation. What is returned depends on the results of the call.
     * Success: A map that contains the following elements.
     * records: An array of records that match the query conditions.
     * type: A string that indicates the type of the sObject that was retrieved.
     * size: The number of records in the response.
     * Failure: A map that contains a single element with the error message for the overall operation. For example, { error: 'errorMessage' }.
     */
    global static Map retrieve(String type, List fields, Map criteria) { return null; }

    global override virtual String toString() { return null; }

    global static Map updat(String type, List ids, Map fields) { return null; }
}