/**
 * Use the HttpResponse class to handle the HTTP response returned by the Http class.
 * Usage
 * Use the XML classes or JSON Classes to parse XML or JSON content in the body of a response accessed by HttpResponse.
 * Example
 * In the following getXmlStreamReader example, content is retrieved via an HTTP callout, then the XML is parsed using the XmlStreamReader class.
 * public with sharing class ReaderFromCalloutSample {
 *     public void getAndParse() {
 *
 *         // Get the XML document from the endpoint
 *         Http http = new Http();
 *         HttpRequest req = new HttpRequest();
 *         req.setEndpoint(URL.getOrgDomainUrl().toExternalForm() + '/services/data');
 *         req.setMethod('GET');
 *         req.setHeader('Accept', 'application/xml');
 *         HttpResponse res = http.send(req);
 *
 *         // Log the XML content
 *         System.debug(res.getBody());
 *
 *         // Generate the HTTP response as an XML stream
 *         XmlStreamReader reader = res.getXmlStreamReader();
 *
 *         // Read through the XML
 *         while(reader.hasNext()) {
 *             System.debug('Event Type:' + reader.getEventType());
 *             if (reader.getEventType() == XmlTag.START_ELEMENT) {
 *             System.debug(reader.getLocalName());
 *             }
 *         reader.next();
 *         }
 *
 *   }
 * }
 */
global class HttpResponse {
    global HttpResponse() { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Retrieves the body returned in the response.
     * Usage
     * Limit 6 MB for synchronous Apex or 12 MB for asynchronous Apex. The HTTP request and response sizes count towards the total heap size.
     */
    global String getBody() { return null; }

    /**
     * Retrieves the body returned in the response as a Blob.
     * Usage
     * Limit 6 MB for synchronous Apex or 12 MB for asynchronous Apex. The HTTP request and response sizes count towards the total heap size.
     */
    global Blob getBodyAsBlob() { return null; }

    /**
     * Retrieves the body returned in the response as a DOM document.
     * Example
     * Use it as a shortcut for:
     * String xml = httpResponse.getBody();
     * Dom.Document domDoc = new Dom.Document(xml);
     */
    global dom.Document getBodyDocument() { return null; }

    /**
     * Retrieves the contents of the response header.
     */
    global String getHeader(String key) { return null; }

    /**
     * Retrieves an array of header keys returned in the response.
     */
    global List getHeaderKeys() { return null; }

    /**
     * Retrieves the status message returned for the response.
     */
    global String getStatus() { return null; }

    /**
     * Retrieves the value of the status code returned in the response.
     */
    global Integer getStatusCode() { return 0; }

    global System.XmlStreamReader getXmlStreamReader() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Specifies the body returned in the response.
     */
    global void setBody(String body) { }

    /**
     * Specifies the body returned in the response using a Blob.
     */
    global void setBodyAsBlob(Blob body) { }

    /**
     * Specifies the contents of the response header.
     */
    global void setHeader(String key, String value) { }

    /**
     * Specifies the status message returned in the response.
     */
    global void setStatus(String status) { }

    /**
     * Specifies the value of the status code returned in the response.
     */
    global void setStatusCode(Integer statusCode) { }

    /**
     * Returns the status message and status code returned in the response, for example:
     * Example
     * Status=OK, StatusCode=200
     */
    global String toString() { return null; }
}