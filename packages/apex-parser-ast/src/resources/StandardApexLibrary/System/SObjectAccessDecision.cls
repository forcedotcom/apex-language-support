/**
 * Contains the results of a call to the Security.stripInaccessible method and methods to retrieve those results.
 */
global class SObjectAccessDecision {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the indexes of sObjects that are modified by the stripInaccessible method.
     * <p>Example
     * In this example, the user doesn’t have permission to update the AnnualRevenue field of an Account.
     * List<Account> accounts = new List<Account>{
     *     new Account(Name='Account1', AnnualRevenue=1000),
     *     new Account(Name='Account2')
     * };
     *
     * // Strip fields that are not updatable
     * SObjectAccessDecision decision = Security.stripInaccessible(
     *     AccessType.UPDATABLE,
     *     accounts);
     *
     * // Print stripped records
     * for (SObject strippedAccount : decision.getRecords()) {
     *     System.debug(strippedAccount);
     * }
     *
     * // Print modified indexes
     * System.debug(decision.getModifiedIndexes());
     * @return A set of unsigned integers that represent the row indexes of the modified sObjects.
     */
    global Set getModifiedIndexes() { return null; }

    /**
     * Returns a list of new sObjects that are identical to the source records, except that they are stripped of fields that fail the field-level security check for the current user.
     * <p>Usage
     * The stripInaccessible method performs field-level access check for the source records in the context of the current user’s operation. The getRecords() method returns the new records that contain only the fields that the current user has access to.
     * <p>Example
     * In this example, the user doesn’t have permission to update the AnnualRevenue field of an Account.
     * List<Account> accounts = new List<Account>{
     *     new Account(Name='Account1', AnnualRevenue=1000),
     *     new Account(Name='Account2')
     * };
     *
     * // Strip fields that are not updatable
     * SObjectAccessDecision decision = Security.stripInaccessible(
     *     AccessType.UPDATABLE,
     *     accounts);
     *
     * // Print stripped records
     * for (SObject strippedAccount : decision.getRecords()) {
     *     System.debug(strippedAccount);
     * }
     * @return Even if the result list contains only one sObject, the return type is still a list (of size one).
     */
    global List getRecords() { return null; }

    /**
     * Returns a map of sObject types to their corresponding inaccessible fields. The map key is a string representation of the sObject type. The map value is a set of strings, which denote the fields names that are inaccessible.
     * <p>Example
     * In this example, the user doesn’t have permission to update the AnnualRevenue field of an Account.
     * List<Account> accounts = new List<Account>{
     *     new Account(Name='Account1', AnnualRevenue=1000),
     *     new Account(Name='Account2')
     * };
     *
     * // Strip fields that are not updatable
     * SObjectAccessDecision decision = Security.stripInaccessible(
     *     AccessType.UPDATABLE,
     *     accounts);
     *
     * // Print stripped records
     * for (SObject strippedAccount : decision.getRecords()) {
     *     System.debug(strippedAccount);
     * }
     * // Print removed fields
     * System.debug(decision.getRemovedFields());
     */
    global Map getRemovedFields() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}