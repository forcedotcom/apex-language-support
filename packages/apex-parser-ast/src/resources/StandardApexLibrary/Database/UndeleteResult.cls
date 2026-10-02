/**
 * The result of an undelete DML operation returned by the Database.undelete method.
 * <p>Usage
 * An array of Database.UndeleteResult objects is returned with the undelete database method. Each element in the UndeleteResult array corresponds to the sObject array passed as the sObject[] parameter in the undelete Database method; that is, the first element in the UndeleteResult array matches the first element passed in the sObject array, the second element corresponds with the second element, and so on. If only one sObject is passed in, the UndeleteResults array contains a single element.
 */
global class UndeleteResult {
    global List errors { get; }
    global Id id { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * If an error occurred, returns an array of one or more database error objects providing the error code and description. If no error occurred, returns null.
     */
    global List getErrors() { return null; }

    /**
     * Returns the ID of the sObject you were trying to undelete.
     * <p>Usage
     * If this field contains a value, the object was successfully undeleted. If this field is empty, the operation was not successful for that object.
     */
    global Id getId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns a Boolean value that is set to true if the DML operation was successful for this object, false otherwise.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}