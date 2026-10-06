/**
 * Contains methods that provide a list or map of all OrgLimit instances for Salesforce your org, such as SOAP API requests, Bulk API requests, and Streaming API limits.
 * Usage
 * Use the System.OrgLimits getAll and getMap methods to obtain either a list or a map of all your org limits. To get details on each limit, use instance methods from System.OrgLimit.
 * For comparison, the Limits Class returns Apex governor limits and not Salesforce API limits.
 * Note
 * Limit values are updated asynchronously, in near-real-time.
 */
global class OrgLimits {
    global OrgLimits() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a list of OrgLimit instances.
     */
    global static List getAll() { return null; }

    /**
     * Returns a map of all OrgLimit instances with the limit name as key.
     * Example
     * Map<String,System.OrgLimit> limitsMap = OrgLimits.getMap();
     * System.OrgLimit apiRequestsLimit = limitsMap.get('DailyApiRequests');
     * System.debug('Limit Name: ' + apiRequestsLimit.getName());
     * System.debug('Usage Value: ' + apiRequestsLimit.getValue());
     * System.debug('Maximum Limit: ' + apiRequestsLimit.getLimit());
     */
    global static Map getMap() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}