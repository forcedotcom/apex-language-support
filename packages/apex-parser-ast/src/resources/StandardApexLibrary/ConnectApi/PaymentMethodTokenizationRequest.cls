/**
 * Payment method tokenization input consumed by the payment tokenization service.
 */
global class PaymentMethodTokenizationRequest extends ConnectApi.BaseRequest {

  /**
   * Address of the payment method.
   */
  global ConnectApi.AddressRequest address;

  /**
   * Object representation of the bank payment method.
   */
  global ConnectApi.BankPaymentMethodRequest bankPaymentMethod;

  /**
   * Object representation of the card payment method.
   */
  global ConnectApi.CardPaymentMethodRequest cardPaymentMethod;

  /**
   * ID of the card payment method's payment gateway.
   */
  global String paymentGatewayId;

  /**
   * Indicates whether the payment method tokenization is configured to be saved by merchant ( true ) or not ( false ). Default value is false .
   */
  global Boolean savedByMerchant;

}