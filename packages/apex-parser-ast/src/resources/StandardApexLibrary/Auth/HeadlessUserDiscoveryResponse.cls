/**
 * Contains methods to describe the result of headless user discovery using a handler that implements the Auth.HeadlessUserDiscoveryHandler interface during headless login, passwordless login, and forgot password flows.
 * Usage
 * Use this class to return a user ID if headless user discovery was successful, or return custom error messages if not.
 */
global class HeadlessUserDiscoveryResponse {
    /**
     * A custom error message that's returned if headless user discovery fails. For example, write custom logic in your headless user discovery handler to see if the user's email address is verified. Then return a custom error message for when it isn't verified.
     * String
     */
    global String customErrorMessage { get; set; }
    /**
     * The user ID for the external user that's associated with the data passed into the login_hint parameter. If there are multiple users associated with the data, it can return multiple IDs, but headless user discovery fails.
     * <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_methods_system_set.htm" target="_blank">Set</a><<a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_methods_system_id.htm" target="_blank">Id</a>>
     */
    global Set userIds { get; set; }

    /**
     * Creates an instance of the Auth.HeadlessUserDiscoveryResponse class to describe the result of headless user discovery based on data passed into the login_hint during headless login, passwordless login, and forgot password flows.
     */
    global HeadlessUserDiscoveryResponse(Set userIds, String customErrorMessage) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}