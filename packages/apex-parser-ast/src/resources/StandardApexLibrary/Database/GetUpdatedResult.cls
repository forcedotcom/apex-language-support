/**
 * Contains the result for the Database.getUpdated method call.
 * Usage
 * Use the methods in this class to obtain detailed information about the updated records returned by Database.getUpdated for a specific time window.
 */
global class GetUpdatedResult {
    global List ids { get; }
    global Date latestdatecovered { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the IDs of records updated within the time window specified in the Database.getUpdated method.
     */
    global List getIds() { return null; }

    /**
     * Returns the date in Coordinated Universal Time (UTC) of the last date covered in the Database.getUpdated call.
     */
    global Date getLatestDateCovered() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}