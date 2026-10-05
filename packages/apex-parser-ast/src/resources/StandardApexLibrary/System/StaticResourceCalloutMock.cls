/**
 * Utility class used to specify a fake response for testing HTTP callouts.
 * <p>Usage
 * Use the methods in this class to set the response properties for testing HTTP callouts.
 */
global class StaticResourceCalloutMock implements System.HttpCalloutMock {
    /**
     * Creates a new instance of the StaticResourceCalloutMock class.
     */
    global StaticResourceCalloutMock() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global System.HttpResponse respond(System.HttpRequest request) { return null; }

    /**
     * Sets the specified header name and value for the fake response.
     */
    global void setHeader(String key, String val) { }

    /**
     * Sets the specified static resource, which contains the response body.
     */
    global void setStaticResource(String staticResourceName) { }

    /**
     * Sets the specified HTTP status for the response.
     */
    global void setStatus(String status) { }

    /**
     * Sets the specified HTTP status for the response.
     */
    global void setStatusCode(Integer code) { }

    global override virtual String toString() { return null; }
}