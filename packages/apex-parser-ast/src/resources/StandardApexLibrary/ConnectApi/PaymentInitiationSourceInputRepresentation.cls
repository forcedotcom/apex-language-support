/**
 * Payment initiation source input representation.
 */
global class PaymentInitiationSourceInputRepresentation {

  /**
   * Application that initiated this payment, such as Revenue Lifecycle Management (RLM).
   */
  global ConnectApi.Application application;

  /**
   * Channel that submitted the payment.
   */
  global String channel;

  /**
   * Map containing custom field names and their corresponding IDs.
   */
  global Map < String , String > customFields;

  /**
   * Process or component of the application that submitted the payment, such as the Billing component of RLM.
   */
  global String process;

  /**
   * Map of standard reference fields and their corresponding IDs.
   */
  global Map < String , String > standardReferences;

}