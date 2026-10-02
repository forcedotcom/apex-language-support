/**
 * Provides methods to test an external service's asynchronous callouts, enables sending a mock request, asserts the expected request payload, then triggers the mocked external service’s asynchronous callback response.
 * <p>Usage
 * See <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.external_services_aysnc_ops_testing.htm&amp;type=5&amp;language=en_US" target="_blank">Create Unit Testing for Asynchronous Callouts</a> in the "Extend Salesforce with Clicks, Not Code" Help Guide.
 */
global class ExternalServiceTest {
    global Object ExternalServiceTest() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sends the HTTP request back as an external service asynchronous response.
     */
    global System.HttpResponse sendCallback(System.HttpRequest request) { return null; }

    global override virtual String toString() { return null; }
}