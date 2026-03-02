/**
 * PaymentGatewayAdapters can implement this interface in order to process requests.
 */
public interface PaymentGatewayAdapter {

  commercepayments.GatewayResponse processRequest(commercepayments.PaymentGatewayContext var1);

}