/**
 * Sends data related to a bank payment method to a gateway adapter during a service call.
 */
global class BankPaymentMethodRequest {

  global BankPaymentMethodRequest() {}

  global String accountHolderFirstName;

  global String accountHolderLastName;

  global String accountHolderName;

  global commercepayments.AccountHolderType accountHolderType;

  global String accountId;

  global String accountNumber;

  global commercepayments.AccountType accountType;

  global Boolean autoPay;

  global String bankCode;

  global commercepayments.BankType bankType;

  global String comments;

  global String email;

  global String mandate;

  global String nickName;

  global commercepayments.StandardEntryClassCode standardEntryClassCode;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}