/**
 * Utility class used to specify a fake response using multiple resources for testing HTTP callouts.
 * <p>Usage
 * Use the methods in this class to set the response properties for testing HTTP callouts. You can specify a resource for each endpoint.
 */
global class MultiStaticResourceCalloutMock implements System.HttpCalloutMock {
    /**
     * Creates a new instance of the System.MultiStaticResourceCalloutMock class.
     */
    global MultiStaticResourceCalloutMock() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global System.HttpResponse respond(System.HttpRequest request) { return null; }

    /**
     * Sets the specified header name and value for the fake response.
     */
    global void setHeader(String key, String val) { }

    /**
     * Sets the specified static resource corresponding to the endpoint. The static resource contains the response body.
     */
    global void setStaticResource(String url, String staticResourceName) { }

    /**
     * Sets the specified HTTP status for the response.
     */
    global void setStatus(String status) { }

    /**
     * Sets the specified HTTP status code for the response.
     */
    global void setStatusCode(Integer code) { }

    global override virtual String toString() { return null; }
}