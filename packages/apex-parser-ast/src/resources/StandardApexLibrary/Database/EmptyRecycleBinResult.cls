/**
 * The result of the emptyRecycleBin DML operation returned by the Database.emptyRecycleBin method.
 * <p>Usage
 * A list of Database.EmptyRecycleBinResult objects is returned by the Database.emptyRecycleBin method. Each object in the list corresponds to either a record ID or an sObject passed as the parameter in the Database.emptyRecycleBin method. The first index in the EmptyRecycleBinResult list matches the first record or sObject specified in the list, the second with the second, and so on.
 */
global class EmptyRecycleBinResult {
    global List errors { get; }
    global Id id { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    global List getErrors() { return null; }

    /**
     * Returns the ID of the record or sObject you attempted to delete.
     */
    global Id getId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if the record or sObject was successfully removed from the Recycle Bin; otherwise false.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}