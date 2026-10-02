/**
 * Use the QuickAction.QuickActionRequest class for providing action information for quick actions to be performed by QuickAction class methods. Action information includes the action name, context record ID, and record.
 * <p>Usage
 * For Apex saved using Salesforce API version 28.0, a parent ID is associated with the QuickActionRequest instead of the context ID.
 * The constructor of this class takes no arguments:
 * QuickAction.QuickActionRequest qar = new QuickAction.QuickActionRequest();
 * <p>Example
 * In this sample, a new quick action is created to create a contact and assign a record to it.
 * QuickAction.QuickActionRequest req = new QuickAction.QuickActionRequest();
 * // Some quick action name
 * req.quickActionName = Schema.Account.QuickAction.AccountCreateContact;
 *
 * // Define a record for the quick action to create
 * Contact c = new Contact();
 * c.lastname = 'last name';
 * req.record = c;
 *
 * // Provide the context ID (or parent ID). In this case, it is an Account record.
 * req.contextid = '001xx000003DGcO';
 *
 * QuickAction.QuickActionResult res = QuickAction.performQuickAction(req);
 */
global class QuickActionRequest {
    global Id contextid { get; set; }
    global String quickactionname { get; set; }
    global SObject record { get; set; }

    /**
     * Creates a new instance of the QuickAction.QuickActionRequest class.
     */
    Object QuickActionRequest() { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns this QuickAction’s context record ID.
     */
    global Id getContextId() { return null; }

    /**
     * Returns this QuickAction’s name.
     */
    global String getQuickActionName() { return null; }

    /**
     * Returns the QuickAction’s associated record.
     */
    global SObject getRecord() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Sets this QuickAction’s context ID. Returned by getContextId.
     * <p>Usage
     * For Apex saved using Salesforce API version 28.0, sets this QuickAction’s parent ID and is returned by getParentId.
     */
    global void setContextId(Id param1) { }

    /**
     * Sets this QuickAction’s name. Returned by getQuickActionName.
     */
    global void setQuickActionName(String param1) { }

    /**
     * Sets a record for this QuickAction. Returned by getRecord.
     */
    global void setRecord(SObject param1) { }

    global String toString() { return null; }
}