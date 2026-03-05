/**
 * Enables sending fake responses when testing Web service callouts of a class auto-generated from a WSDL.
 */
global interface WebServiceMock {

  /**
   * The implementation of this method is called by the Apex runtime to send a fake response when a Web service callout is made after Test.setMock has been called.
   * @param stub An instance of the auto-generated class.
   * @param soapRequest The SOAP Web service request being invoked.
   * @param responseMap A collection of key/value pairs representing the response to send for the request.
   * @param endpoint The endpoint URL for the request.
   * @param soapAction The requested SOAP operation.
   * @param requestName The requested SOAP operation name.
   * @param responseNamespace The response namespace.
   * @param responseName The name of the response element as defined in the WSDL.
   * @param responseType The class for the response as defined in the auto-generated class.
   */
  void doInvoke(Object stub, Object soapRequest, Map<String,Object> responseMap, String endpoint, String soapAction, String requestName, String responseNamespace, String responseName, String responseType);

}