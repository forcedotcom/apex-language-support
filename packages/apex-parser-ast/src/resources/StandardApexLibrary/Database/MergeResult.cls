/**
 * Contains the result of a merge Database method operation.
 * <p>Usage
 * The Database.merge method returns a Database.MergeResult object for each merged record.
 */
global class MergeResult {
    global List errors { get; }
    global Id id { get; }
    global List mergedrecordids { get; }
    global Boolean success { get; }
    global List updatedrelatedids { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns a list of Database.Error objects representing the errors encountered, if any, during a merge operation using the Database.merge method. If no error occurred, returns null.
     */
    global List getErrors() { return null; }

    /**
     * Returns the ID of the master record into which other records were merged.
     */
    global Id getId() { return null; }

    /**
     * Returns the IDs of the records merged into the master record.
     */
    global List getMergedRecordIds() { return null; }

    /**
     * Returns the IDs of all related records that were reparented as a result of the merge that are viewable by the user sending the merge call.
     */
    global List getUpdatedRelatedIds() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Indicates whether the merge was successful (true) or not (false).
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}