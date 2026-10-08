/**
 * Contains methods that provide the name, maximum value, and current value of an org limit.
 * Usage
 * Use the System.OrgLimits getAll and getMap methods to obtain either a list or a map of all your org limits. To get details on each limit, use instance methods from System.OrgLimit.
 * For comparison, the Limits Class returns Apex governor limits and not Salesforce API limits.
 * Note
 * Limit values are updated asynchronously, in near-real-time.
 */
global class OrgLimit {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the maximum allowed limit value.
     * Example
     * List<System.OrgLimit> limits = OrgLimits.getAll();
     * for (System.OrgLimit aLimit: limits) {
     *     System.debug('Limit: ' + aLimit.getName());
     *     System.debug('Max Limit is: ' + aLimit.getLimit());
     * }
     */
    global Integer getLimit() { return 0; }

    /**
     * Returns the limit’s name.
     * Example
     * List<System.OrgLimit> limits = OrgLimits.getAll();
     * for (System.OrgLimit aLimit: limits) {
     *     System.debug('Limit: ' + aLimit.getName());
     *     System.debug('Max Limit is: ' + aLimit.getLimit());
     * }
     */
    global String getName() { return null; }

    /**
     * Returns the limit usage value.
     * Example
     * List<System.OrgLimit> limits = OrgLimits.getAll();
     * for (System.OrgLimit aLimit: limits) {
     *     System.debug('Limit: ' + aLimit.getName());
     *     System.debug('Usage Value is: ' + aLimit.getValue());
     * }
     */
    global Integer getValue() { return 0; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns the string representation of the org limit.
     * @return String denoting the name, current consumption, and maximum value of the org limit. For example:
     * OrgLimit[DailyBulkApiBatches: consumed 25 of 15000]
     */
    global override String toString() { return null; }
}