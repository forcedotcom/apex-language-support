/**
 * Use the System.RestRequest class to access and pass request data in a RESTful Apex method.
 * <p>Usage
 * An Apex RESTful Web service method is defined using one of the REST annotations. For more information about Apex RESTful Web service, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_rest.htm" target="_blank">Exposing Apex Classes as REST Web Services</a>.
 * <p>Example: An Apex Class with REST Annotated Methods
 * The following example shows you how to implement the Apex REST API in Apex. This class exposes three methods that each handle a different HTTP request: GET, DELETE, and POST. You can call these annotated methods from a client by issuing HTTP requests.
 * @RestResource(urlMapping='/Account/*')
 * global with sharing class MyRestResource {
 *
 *     @HttpDelete
 *     global static void doDelete() {
 *         RestRequest req = RestContext.request;
 *         RestResponse res = RestContext.response;
 *         String accountId = req.requestURI.substring(req.requestURI.lastIndexOf('/')+1);
 *         Account account = [SELECT Id FROM Account WHERE Id = :accountId WITH USER_MODE];
 *         delete as user account;
 *     }
 *
 *     @HttpGet
 *     global static Account doGet() {
 *         RestRequest req = RestContext.request;
 *         RestResponse res = RestContext.response;
 *         String accountId = req.requestURI.substring(req.requestURI.lastIndexOf('/')+1);
 *         Account result = [SELECT Id, Name, Phone, Website FROM Account WHERE Id = :accountId WITH USER_MODE];
 *         return result;
 *     }
 *
 *   @HttpPost
 *     global static String doPost(String name,
 *         String phone, String website) {
 *         Account account = new Account();
 *         account.Name = name;
 *         account.phone = phone;
 *         account.website = website;
 *         insert as user account;
 *         return account.Id;
 *     }
 * }
 */
global class RestRequest {
    /**
     * Returns the headers that are received by the request.
     * <p>Map<String, String>
     */
    global final Map headers { get; }
    /**
     * Returns one of the supported HTTP request methods.
     * <p>String
     * Possible values returned:
     * DELETE
     * GET
     * HEAD
     * PATCH
     * POST
     * PUT
     */
    global String httpMethod { get; set; }
    /**
     * Returns the parameters that are received by the request.
     * <p>Map<String, String>
     */
    global final Map params { get; }
    /**
     * Returns the IP address of the client making the request.
     * <p>String
     */
    global String remoteAddress { get; set; }
    /**
     * Returns or sets the body of the request.
     * <p>Usage
     * If the Apex method has no parameters, then Apex REST copies the HTTP request body into the RestRequest.requestBody property. If there are parameters, then Apex REST attempts to deserialize the data into those parameters and the data won't be deserialized into the RestRequest.requestBody property.
     * <p>Blob
     */
    global Blob requestBody { get; set; }
    /**
     * Returns or sets everything after the host in the HTTP request string.
     * <p>Example
     * For example, if the request string is https://instance.salesforce.com/services/apexrest/Account/ then the requestURI is /Account/.
     * <p>String
     */
    global String requestURI { get; set; }
    /**
     * Returns the REST resource path for the request.
     * <p>Example
     * For example, if the Apex REST class defines a urlMapping of /MyResource/*, the resourcePath property returns /services/apexrest/MyResource/*.
     * <p>String
     */
    global String resourcePath { get; set; }

    /**
     * Creates a new instance of the System.RestRequest class.
     */
    global Object RestRequest() { return null; }

    /**
     * Adds a header to the request header map in an Apex test.
     * <p>Usage
     * This method is intended for unit testing of Apex REST classes.
     * The following headers aren't allowed:
     * cookie
     * set-cookie
     * set-cookie2
     * content-length
     * authorization
     * If any of these headers are used, an Apex exception is thrown.
     */
    global void addHeader(String name, String value) { }

    /**
     * Adds a parameter to the request params map in an Apex test.
     * <p>Usage
     * This method is intended for unit testing of Apex REST classes.
     */
    global void addParameter(String name, String value) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}