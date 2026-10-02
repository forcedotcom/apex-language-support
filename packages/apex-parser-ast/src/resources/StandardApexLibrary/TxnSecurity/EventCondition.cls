/**
 * Allows an implementing class to specify whether to take action when certain events occur based on a transaction security policy. This interface is only used for Apex policies created in Real-Time Event Monitoring.
 * <p>Usage
 * The evaluate method is called upon the occurrence of a real-time event monitored by a transaction security policy. A typical implementation first selects the fields of interest from the event. Then the fields are tested to see if they meet the conditions being monitored. If the conditions are met, the method returns true.
 * For example, imagine a transaction security policy that triggers when a user queries more than 1,000 lead records. For each API event, the evaluate method checks whether the RowsProcessed value is greater than 1,000 and the QueriedEntities value contains “Lead”. If so, true is returned.
 * We recommend having test classes for the policy condition interface to ensure it works correctly. Testing is required regardless of whether the policy is moved from a sandbox to production, with a change set, or some other way. For example, test your policies in your development environment before moving the policies to production.
 * For more information about testing Apex transaction security policies, read <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.enhanced_transaction_security_apex_testing.htm&amp;type=5&amp;language=en_US" target="_blank">Transaction Security Apex Testing</a>.
 */
global interface EventCondition {
    virtual Boolean equals(Object arg0);

    /**
     * Evaluates an event against a transaction security policy created in Real-Time Event Monitoring. If the event triggers the policy, the method returns true.
     * @return Returns true when the policy is triggered. For example, suppose that the policy is to limit users to a single login session. If a user tries to log in a second time, the policy blocks the attempted login, and updates the Status, PolicyId, and PolicyOutcome fields of that LoginEvent. The policy also sends an email notification to the Salesforce admin. The evaluate method only checks the login event, and returns true if it’s the user’s second login attempt.
     * The system performs the action and notification, not the evaluate method.
     */
    abstract Boolean evaluate(SObject event);

    virtual Integer hashCode();

    virtual String toString();
}