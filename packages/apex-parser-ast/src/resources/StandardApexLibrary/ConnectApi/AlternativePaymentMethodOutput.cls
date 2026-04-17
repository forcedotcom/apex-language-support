/**
 * Alternative payment method details output.
 */
global class AlternativePaymentMethodOutput {

  /**
   * Salesforce Payments account to which this payment method is linked.
   */
  global String accountId;

  /**
   * Details about a record added by a user. Maximum of 1,000 characters.
   */
  global String comments;

  /**
   * Email address of the card holder.
   */
  global String email;

  /**
   * A unique, alphanumeric ID, called a token, that a payment gateway generates when it first processes a payment. The token replaces the actual payment data so that the data is kept secure. This token is stored as encrypted text, and can be used for recurring payments.
   */
  global String gatewayToken;

  /**
   * Detailed information about the gateway token.
   */
  global String gatewayTokenDetails;

  /**
   * Name that you assign to the payment method object.
   */
  global String name;

}