/**
 * Makes an HTTP request to start the interaction with the payment gateway.
 */
global class PaymentsHttp {

  global PaymentsHttp() {}

  /**
   * Sends an HttpRequest and returns the response.
   * @param request 
   * @return HttpResponse
   */
  global HttpResponse send(HttpRequest request) {}

  global Object clone() {}

  global void setExcludeResponseLogging(Boolean excludeResponseLogging) {}

}