/**
 * Wraps the information related to a payment request.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.PaymentGatewayContext pgc = new CommercePayments.PaymentGatewayContext();
 * <p>Example
 * global commercepayments.GatewayResponse processRequest(commercepayments.PaymentGatewayContext gatewayContext) {
 *     commercepayments.RequestType requestType = gatewayContext.getPaymentRequestType();
 *     if (requestType == commercepayments.RequestType.Capture) {
 *         commercepayments.CaptureRequest captureRequest = (commercepayments.CaptureRequest) gatewayContext.getPaymentRequest();
 *     }
 * }
 */
global with sharing class PaymentGatewayContext {
    global PaymentGatewayContext(commercepayments.PaymentGatewayRequest request, commercepayments.RequestType requestType) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the payment request object.
     */
    global commercepayments.PaymentGatewayRequest getPaymentRequest() { return null; }

    global commercepayments.RequestType getPaymentRequestType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}