/**
 * Card payment method details output.
 */
global class CardPaymentMethodOutput {

  /**
   * Salesforce Payments account to which this payment method is linked.
   */
  global String accountId;

  /**
   * Indicates whether a token for recurring payments is being requested ( true ) or not ( false ). The token lets the payment method be used for recurring payments.
   */
  global Boolean autoPay;

  /**
   * Bank Identification Number (BIN). The BIN is the first 4-6 numbers on a payment card that identifies the card issuer.
   */
  global String cardBin;

  /**
   * CreditCard DebitCard
   */
  global ConnectApi.CardCategory cardCategory;

  /**
   * First name of the card holder
   */
  global String cardHolderFirstName;

  /**
   * Last name of the card holder
   */
  global String cardHolderLastName;

  /**
   * Full name of card holder
   */
  global String cardHolderName;

  /**
   * Last four digits on a card.
   */
  global String cardLastFour;

  /**
   * Credit card issuer. AmericanExpress DinersClub JCB Maestro MasterCard Visa
   */
  global ConnectApi.CardType cardType;

  /**
   * Details about a record added by a user. Maximum of 1,000 characters.
   */
  global String comments;

  /**
   * Card displayed number
   */
  global String displayCardNumber;

  /**
   * Email address of the card holder.
   */
  global String email;

  /**
   * Card expiration month
   */
  global Integer expiryMonth;

  /**
   * Card expiration year
   */
  global Integer expiryYear;

  /**
   * Optional card nickname
   */
  global String nickName;

  /**
   * Month when card becomes active
   */
  global Integer startMonth;

  /**
   * Year when card becomes active
   */
  global Integer startYear;

}