/**
 * Use to respond with an error indication following errors from the PaymentGateway adapter, such as request-forbidden responses, custom validation errors, or expired API tokens.
 * <p>Usage
 * Use GatewayErrorResponse to create an object that stores information about error responses sent by the payment gateway adapter.
 * <p>Example
 * If GatewayResponse receives an exception rather than a valid request, it calls GatewayErrorResponse to create an error object with information about the exception.
 * global commercepayments.GatewayResponse processRequest(commercepayments.paymentGatewayContext gatewayContext) {
 *         commercepayments.RequestType requestType = gatewayContext.getPaymentRequestType();
 *         commercepayments.GatewayResponse response;
 *         try {
 *             if (requestType == commercepayments.RequestType.Authorize) {
 *                 response = createAuthResponse((commercepayments.AuthorizationRequest)gatewayContext.getPaymentRequest());
 *             } else if (requestType == commercepayments.RequestType.Capture) {
 *                 response =  createCaptureResponse((commercepayments.CaptureRequest)gatewayContext.getPaymentRequest()) ;
 *             } else if (requestType == commercepayments.RequestType.ReferencedRefund) {
 *                 response = createRefundResponse((commercepayments.ReferencedRefundRequest)gatewayContext.getPaymentRequest());
 *             }
 *             return response;
 *         } catch(SalesforceValidationException e) {
 *              commercepayments.GatewayErrorResponse error = new commercepayments.GatewayErrorResponse('400', e.getMessage());
 *              return error;
 *         }
 *     }
 */
global with sharing class GatewayErrorResponse implements commercepayments.GatewayResponse {
    /**
     * Constructor to create a GatewayErrorResponse object that accepts errorCode and errorMessage.
     */
    global GatewayErrorResponse(String errorCode, String errorMessage) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}