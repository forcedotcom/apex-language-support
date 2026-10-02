/**
 * Enables sending fake responses when testing Web service callouts of a class auto-generated from a WSDL.
 * <p>Usage
 * For an implementation example, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_callouts_wsdl2apex_testing.htm" target="_blank">Test Web Service Callouts</a>.
 */
global interface WebServiceMock {
    /**
     * The implementation of this method is called by the Apex runtime to send a fake response when a Web service callout is made after Test.setMock has been called.
     * <p>Usage
     */
    abstract void doInvoke(Object stub, Object request, Map response, String endpoint, String soapAction, String requestName, String responseNS, String responseName, String responseType);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}