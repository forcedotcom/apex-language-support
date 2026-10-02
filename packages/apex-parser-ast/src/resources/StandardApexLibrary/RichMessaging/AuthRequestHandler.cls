/**
 * Use this interface to handle authorization request responses.
 * <p>Usage
 * When using this interface, the following limits are overridden. See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_gov_limits.htm" target="_blank">Execution Governors and Limits</a> in the Apex Developer Guide.
 * Table 1. Overridden Limits
 * Limit Name Overridden Value
 * Total number of SOQL queries issued 2
 * Total number of records retrieved by a single SOSL query 2
 * Total number of DML statements issued 1
 * Total number of records processed as a result of DML statements 1
 * Total number of callouts (HTTP requests or web services calls) in a transaction 2
 */
global interface AuthRequestHandler {
    virtual Boolean equals(Object arg0);

    /**
     * Handles authorization request response.
     */
    abstract RichMessaging.AuthRequestResult handleAuthRequest(RichMessaging.AuthRequestResponse authRequestResponse);

    virtual Integer hashCode();

    virtual String toString();
}