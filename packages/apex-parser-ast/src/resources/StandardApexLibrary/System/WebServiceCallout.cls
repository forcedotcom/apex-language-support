/**
 * Enables making callouts to SOAP operations on an external Web service. This class is used in the Apex stub class that is auto-generated from a WSDL.
 */
public class WebServiceCallout {

  /**
   * Invokes an external SOAP web service operation based on an Apex class that is auto-generated from a WSDL.
   * @param stub An instance of the Apex class that is auto-generated from a WSDL (the stub class).
   * @param request The request to the external service. The request is an instance of a type that is created as part of the auto-generated stub class.
   * @param String 
   * @param response A map of key-value pairs that represent the response that the external service sends after receiving the request. In each pair, the key is a response identifier. The value is the response object, which is an instance of a type that is created as part of the auto-generated stub class.
   * @param infoArray An array of strings that contains information about the callout—web service endpoint, SOAP action, request, and response. The order of the elements in the array matters. Element at index 0 ( [0] ): One of the following options for identifying the URL of the external web service. Endpoint URL. For example: 'http://YourServer/YourService' Named credential URL, which contains the scheme callout , the name of the named credential, and optionally, an appended path. For example: 'callout:MyNamedCredential/some/path' Element at index 1 ( [1] ): The SOAP action. For example: 'urn:dotnet.callouttest.soap.sforce.com/EchoString' Element at index 2 ( [2] ): The request namespace. For example: 'http://doc.sample.com/docSample' Element at index 3 ( [3] ): The request name. For example: 'EchoString' Element at index 4 ( [4] ): The response namespace. For example: 'http://doc.sample.com/docSample' Element at index 5 ( [5] ): The response name. For example: 'EchoStringResponse' Element at index 6 ( [6] ): The response type. For example: 'docSample.EchoStringResponse_element'
   */
  public static void invoke(Object stub, Object request, Map< String, Object > response, List< String > infoArray) {}

}