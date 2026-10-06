/**
 * Represents information about an error that occurred during a DML operation when using a Database method.
 * Usage
 * Error class is part of SaveResult, which is generated when a user attempts to save a Salesforce record.
 */
global class Error {
    global List fields { get; }
    global String message { get; }
    global System.StatusCode statuscode { get; }

    global Boolean equals(Object obj) { return false; }

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