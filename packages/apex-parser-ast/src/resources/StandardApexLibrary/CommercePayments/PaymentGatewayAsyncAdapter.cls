/**
 * Implement the interface to allow customers to process payments asynchronously.
 */
public interface PaymentGatewayAsyncAdapter {

  /**
   * Entry point for processing notifications from payment gateways.
   * @param var1 
   * @return commercepayments.GatewayNotificationResponse
   */
  commercepayments.GatewayNotificationResponse processNotification(commercepayments.PaymentGatewayNotificationContext var1);

}