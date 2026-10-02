/**
 * The result of an upsert DML operation returned by the Database.upsert method.
 * <p>Usage
 * An array of Database.UpsertResult objects is returned with the upsert database method. Each element in the UpsertResult array corresponds to the sObject array passed as the sObject[] parameter in the upsert Database method; that is, the first element in the UpsertResult array matches the first element passed in the sObject array, the second element corresponds with the second element, and so on. If only one sObject is passed in, the UpsertResults array contains a single element.
 */
global class UpsertResult {
    global Boolean created { get; }
    global List errors { get; }
    global Id id { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * If an error occurred, returns an array of one or more database error objects providing the error code and description. If no error occurred, returns an empty set.
     */
    global List getErrors() { return null; }

    /**
     * Returns the ID of the sObject you were trying to update or insert.
     * <p>Versioned Behavior Changes
     * In API version 53.0 and later, the method returns the sObject ID. However, if record locking fails during the update operation, the method returns a null value.
     * In API version 52.0 and earlier, the method returned a null value if the record wasn’t updated successfully.
     */
    global Id getId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * A Boolean value that is set to true if the record was created, false if the record was updated.
     */
    global Boolean isCreated() { return false; }

    /**
     * Returns a Boolean value that is set to true if the DML operation was successful for this object, false otherwise.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}