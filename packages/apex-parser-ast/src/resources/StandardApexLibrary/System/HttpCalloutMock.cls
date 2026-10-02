/**
 * Enables sending fake responses when testing HTTP callouts.
 * <p>Usage
 * For an implementation example, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_restful_http_testing_httpcalloutmock.htm" target="_blank">Testing HTTP Callouts by Implementing the HttpCalloutMock Interface</a>.
 */
global interface HttpCalloutMock {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract System.HttpResponse respond(System.HttpRequest request);

    virtual String toString();
}