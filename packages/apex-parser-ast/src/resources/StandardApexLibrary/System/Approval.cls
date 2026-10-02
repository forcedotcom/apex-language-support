/**
 * Contains methods for processing approval requests and setting approval-process locks and unlocks on records.
 * <p>Usage
 * Salesforce admins can edit locked records. Depending on your approval process configuration settings, an assigned approver can also edit locked records. Locks and unlocks that are set programmatically use the same record editability settings as other approval-process locks and unlocks.
 * Record locks and unlocks are treated as DML. They’re blocked before a callout, they count toward your DML limits, and if a failure occurs, they’re rolled back along with the rest of your transaction. To change this rollback behavior, use an allOrNone parameter.
 * Approval is also used as a namespace for the ProcessRequest and ProcessResult classes.
 */
global class Approval {
    /**
     * Returns true if the record with the ID id is locked, or false if it’s not.
     */
    global static Boolean isLocked(Id id) { return false; }

    /**
     * Returns true if the sobject record is locked, or false if it’s not.
     */
    global static Boolean isLocked(SObject sobject) { return false; }

    /**
     * Returns a map of record IDs and their lock statuses. If the record is locked the status is true. If the record is not locked the status is false.
     */
    global static Map isLocked(List ids) { return null; }

    /**
     * Returns a map of record IDs to lock statuses. If the record is locked the status is true. If the record is not locked the status is false.
     */
    global static Map isLocked(List sobjects) { return null; }

    /**
     * Locks a set of objects, and returns the lock results, including failures.
     */
    global static List lock(List ids) { return null; }

    /**
     * Locks a set of objects, and returns the lock results, including failures.
     */
    global static List lock(List sobjects) { return null; }

    /**
     * Locks a set of objects, with the option for partial success. It returns the lock results, including failures.
     */
    global static List lock(List ids, Boolean allOrNothing) { return null; }

    /**
     * Locks a set of objects, with the option for partial success. It returns the lock results, including failures.
     */
    global static List lock(List sobjects, Boolean allOrNothing) { return null; }

    /**
     * Locks an object, and returns the lock results.
     */
    global static Approval.LockResult lock(Id id) { return null; }

    /**
     * Locks an object, and returns the lock results.
     */
    global static Approval.LockResult lock(SObject sobject) { return null; }

    /**
     * Locks an object, with the option for partial success, and returns the lock result.
     */
    global static Approval.LockResult lock(Id id, Boolean allOrNothing) { return null; }

    /**
     * Locks an object, with the option for partial success, and returns the lock result.
     */
    global static Approval.LockResult lock(SObject sobject, Boolean allOrNothing) { return null; }

    /**
     * Unlocks a set of objects, and returns the unlock results, including failures.
     */
    global static List unlock(List ids) { return null; }

    /**
     * Unlocks a set of objects, and returns the unlock results, including failures.
     */
    global static List unlock(List sobjects) { return null; }

    /**
     * Unlocks a set of objects, with the option for partial success. It returns the unlock results, including failures.
     */
    global static List unlock(List ids, Boolean allOrNothing) { return null; }

    /**
     * Unlocks a set of objects, with the option for partial success. It returns the unlock results, including failures.
     */
    global static List unlock(List sobjects, Boolean allOrNothing) { return null; }

    /**
     * Unlocks an object, and returns the unlock results.
     */
    global static Approval.UnlockResult unlock(Id id) { return null; }

    /**
     * Unlocks an object, and returns the unlock results.
     */
    global static Approval.UnlockResult unlock(SObject sobject) { return null; }

    /**
     * Unlocks an object, with the option for partial success, and returns the unlock result.
     */
    global static Approval.UnlockResult unlock(Id id, Boolean allOrNothing) { return null; }

    /**
     * Unlocks an object, with the option for partial success, and returns the unlock result.
     */
    global static Approval.UnlockResult unlock(SObject sobject, Boolean allOrNothing) { return null; }
}