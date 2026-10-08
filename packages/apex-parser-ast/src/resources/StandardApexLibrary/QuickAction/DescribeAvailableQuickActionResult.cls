/**
 * Contains describe metadata information for a quick action that is available for a specified parent.
 * Usage
 * The QuickAction describeAvailableQuickActions method returns an array of available quick action describe result objects (QuickAction.DescribeAvailableQuickActionResult).
 */
global class DescribeAvailableQuickActionResult {
    global String actionenumorid { get; }
    global String label { get; }
    global String name { get; }
    global String type { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the unique ID for the action. If the action doesn’t have an ID, its API name is used.
     */
    global String getActionEnumOrId() { return null; }

    /**
     * The quick action label.
     */
    global String getLabel() { return null; }

    /**
     * The quick action name.
     */
    global String getName() { return null; }

    /**
     * The quick action type.
     */
    global String getType() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}