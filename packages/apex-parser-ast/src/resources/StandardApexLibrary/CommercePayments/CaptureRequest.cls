/**
 * Represents a capture request. This class extends the BaseRequest class and inherits all its methods.
 */
global class CaptureRequest {

  global CaptureRequest(Double amount, String authorizationId) {}

  global String accountId;

  global Double amount;

  global String paymentAuthorizationId;

}