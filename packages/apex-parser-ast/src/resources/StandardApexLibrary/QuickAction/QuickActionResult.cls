/**
 * After you initiate a quick action with the QuickAction class, use the QuickActionResult class for processing action results.
 */
global class QuickActionResult {
    global Id contextid { get; }
    global Boolean created { get; }
    global List errors { get; }
    global List ids { get; }
    global Boolean success { get; }
    global String successmessage { get; }

    global Boolean equals(Object obj) { return false; }

    global Id getContextId() { return null; }

    /**
     * If an error occurs, an array of one or more database error objects, along with error codes and descriptions, is returned.
     */
    global List getErrors() { return null; }

    /**
     * The IDs of the QuickActions being processed.
     */
    global List getIds() { return null; }

    /**
     * Returns the success message associated with the quick action.
     */
    global String getSuccessMessage() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if the action is created; otherwise, false.
     */
    global Boolean isCreated() { return false; }

    /**
     * Returns true if the action completes successfully; otherwise, false.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}