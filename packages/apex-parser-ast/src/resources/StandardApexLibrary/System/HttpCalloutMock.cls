/**
 * Enables sending fake responses when testing HTTP callouts.
 */
public interface HttpCalloutMock {

  /**
   * Returns an HTTP response for the given request. The implementation of this method is called by the Apex runtime to send a fake response when an HTTP callout is made after Test.setMock has been called.
   * @param request 
   * @return HttpResponse
   */
  HttpResponse respond(HttpRequest request);

}