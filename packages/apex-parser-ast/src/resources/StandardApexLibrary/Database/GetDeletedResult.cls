/**
 * Contains the deleted records retrieved for a specific sObject type and time window.
 * Usage
 * The Database.getDeleted method returns the deleted record information as a Database.GetDeletedResult object.
 */
global class GetDeletedResult {
    global List deletedrecords { get; }
    global Date earliestdateavailable { get; }
    global Date latestdatecovered { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns a list of deleted records for the time window specified in the Database.getDeleted method call.
     */
    global List getDeletedRecords() { return null; }

    /**
     * Returns the date in Coordinated Universal Time (UTC) of the earliest physically deleted object for the sObject type specified in Database.getDeleted.
     */
    global Date getEarliestDateAvailable() { return null; }

    /**
     * Returns the date in Coordinated Universal Time (UTC) of the last date covered in the Database.getDeleted call.
     * Usage
     * If there is a value, it is less than or equal to the endDate argument of Database.getDeleted. A value here indicates that, for safety, you should use this value for the startDate of your next call to capture the changes that started after this date but didn’t complete before endDate and were, therefore, not returned in the previous call.
     */
    global Date getLatestDateCovered() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}