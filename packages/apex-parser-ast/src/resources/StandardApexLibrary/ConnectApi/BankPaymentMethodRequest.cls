/**
 * Bank payment method input representation.
 */
global class BankPaymentMethodRequest {

  /**
   * First name of the bank account holder.
   */
  global String accountHolderFirstName;

  /**
   * Last name of the bank account holder.
   */
  global String accountHolderLastName;

  /**
   * Name of the bank account holder.
   */
  global String accountHolderName;

  /**
   * Bank account holder type. Valid values are: Business Individual
   */
  global ConnectApi.AccountHolderType accountHolderType;

  /**
   * Salesforce account to which this payment method is linked.
   */
  global String accountId;

  /**
   * Unique account number for the bank account.
   */
  global String accountNumber;

  /**
   * Bank account type. Valid values are: Business Savings for e.g. Savings/Checking
   */
  global ConnectApi.AccountType accountType;

  /**
   * Indicates whether a token for recurring payments is being requested ( true ) or not ( false ). The token lets the payment method be used for recurring payments.
   */
  global Boolean autoPay;

  /**
   * Routing number is a unique nine-digit code that identifies the bank.
   */
  global String bankCode;

  /**
   * Bank type. Valid values are: ACH —Automated Clearing House transaction BACS —Bankers' Automated Clearing Services transaction BECS —Bulk Electronic Clearing System transaction SepaDebit —Single Euro Payments Area transaction
   */
  global ConnectApi.BankType bankType;

  /**
   * Comments for providing more information about the bank.
   */
  global String comments;

  /**
   * Email address of the bank account holder.
   */
  global String email;

  /**
   * Authorization from the account holder to debit their payment method.
   */
  global String mandate;

  /**
   * Nick name of the bank account holder.
   */
  global String nickName;

  /**
   * Three-letter code that identifies the type of electronic payment transaction being processed within the Automated Clearing House (ACH) network. Valid values are: CCD —Corporate Credit or Debit PPD —Prearranged Payment and Deposit TEL —Telephone-Initiated Entry WEB —Internet Initiated/Mobile
   */
  global ConnectApi.StandardEntryClassCode standardEntryClassCode;

}