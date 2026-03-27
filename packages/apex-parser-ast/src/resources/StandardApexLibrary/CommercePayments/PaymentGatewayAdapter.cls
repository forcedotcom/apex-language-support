/**
 * PaymentGatewayAdapters can implement this interface in order to process requests.
 */
global interface PaymentGatewayAdapter {

  commercepayments.GatewayResponse processRequest(commercepayments.PaymentGatewayContext var1);

}