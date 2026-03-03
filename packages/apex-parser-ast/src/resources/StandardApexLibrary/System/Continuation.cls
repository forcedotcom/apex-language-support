/**
 * Use the Continuation class to make callouts asynchronously to a SOAP or REST Web service.
 */
global class Continuation {

  /**
   * Adds the HTTP request for the callout that is associated with this continuation.
   * @param request The HTTP request to be sent to the external service by this continuation.
   * @return String
   */
  public String addHttpRequest(System.HttpRequest request) {}

  /**
   * Returns all labels and requests that are associated with this continuation as key-value pairs.
   * @return Map< String ,System.HttpRequest>
   */
  public Map< String ,System.HttpRequest> getRequests() {}

  /**
   * Returns the response for the request that corresponds to the specified label.
   * @param requestLabel The request label to get the response for.
   * @return HttpResponse
   */
  public static HttpResponse getResponse(String requestLabel) {}

}