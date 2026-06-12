/**
 * Use the HttpResponse class to handle the HTTP response returned by the Http class.
 */
global class HttpResponse {

  global HttpResponse() {}

  /**
   * Retrieves the body returned in the response.
   * @return String
   */
  global String getBody() {}

  /**
   * Retrieves the body returned in the response as a Blob.
   * @return Blob
   */
  global Blob getBodyAsBlob() {}

  /**
   * Retrieves the body returned in the response as a DOM document.
   * @return Dom.Document
   */
  global Dom.Document getBodyDocument() {}

  /**
   * Retrieves the contents of the response header.
   * @param key 
   * @return String
   */
  global String getHeader(String key) {}

  /**
   * Retrieves an array of header keys returned in the response.
   * @return String[]
   */
  global String[] getHeaderKeys() {}

  /**
   * Retrieves the status message returned for the response.
   * @return String
   */
  global String getStatus() {}

  /**
   * Retrieves the value of the status code returned in the response.
   * @return Integer
   */
  global Integer getStatusCode() {}

  /**
   * Returns an XmlStreamReader that parses the body of the callout response.
   * @return XmlStreamReader
   */
  global XmlStreamReader getXmlStreamReader() {}

  /**
   * Specifies the body returned in the response.
   * @param body 
   */
  global void setBody(String body) {}

  /**
   * Specifies the body returned in the response using a Blob.
   * @param body 
   */
  global void setBodyAsBlob(Blob body) {}

  /**
   * Specifies the contents of the response header.
   * @param key 
   * @param value 
   */
  global void setHeader(String key, String value) {}

  /**
   * Specifies the status message returned in the response.
   * @param status 
   */
  global void setStatus(String status) {}

  /**
   * Specifies the value of the status code returned in the response.
   * @param statusCode 
   */
  global void setStatusCode(Integer statusCode) {}

  /**
   * Returns the status message and status code returned in the response, for example:
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}