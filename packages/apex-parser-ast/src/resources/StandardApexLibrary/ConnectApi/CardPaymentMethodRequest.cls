/**
 * Card payment method input representation.
 */
global class CardPaymentMethodRequest extends ConnectApi.BasePaymentMethodRequest {

  /**
   * Salesforce Payments account to which this payment method is linked.
   */
  global String accountId;

  /**
   * Indicates whether a token for recurring payments is being requested ( true ) or not ( false ). The token lets the payment method be used for recurring payments.
   */
  global Boolean autoPay;

  /**
   * Card processing type. Valid values are: CreditCard DebitCard
   */
  global ConnectApi.CardCategory cardCategory;

  /**
   * First name of the card holder.
   */
  global String cardHolderFirstName;

  /**
   * Last name of the card holder.
   */
  global String cardHolderLastName;

  /**
   * Full name of the card holder.
   */
  global String cardHolderName;

  /**
   * Card number.
   */
  global String cardNumber;

  /**
   * Card network type. Valid values are: AmericanExpress DinersClub JCB MasterCard Maestro Visa
   */
  global String cardType;

  /**
   * Optional comments for the card payment method.
   */
  global String comments;

  /**
   * Card Verification Value.
   */
  global String cvv;

  /**
   * Email address of the card holder.
   */
  global String email;

  /**
   * Card expiration month.
   */
  global Integer expiryMonth;

  /**
   * Card expiration year.
   */
  global Integer expiryYear;

  /**
   * Optional nickname for the card.
   */
  global String nickName;

  /**
   * Month the card becomes active.
   */
  global Integer startMonth;

  /**
   * Year the card becomes active.
   */
  global Integer startYear;

}