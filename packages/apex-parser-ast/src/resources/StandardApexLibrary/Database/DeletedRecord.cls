/**
 * Contains information about a deleted record.
 * Usage
 * The getDeletedRecords method of the Database.GetDeletedResult class returns a list of Database.DeletedRecord objects. Use the methods in the Database.DeletedRecord class to retrieve details about each deleted record.
 */
global class DeletedRecord {
    global Date deleteddate { get; }
    global Id id { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the deleted date of this record.
     */
    global Date getDeletedDate() { return null; }

    /**
     * Returns the ID of a record deleted within the time window specified in the Database.getDeleted method.
     */
    global Id getId() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}