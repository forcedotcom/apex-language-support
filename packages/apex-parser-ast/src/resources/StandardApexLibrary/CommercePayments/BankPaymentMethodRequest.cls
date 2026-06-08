/**
 * Sends data related to a bank payment method to a gateway adapter during a service call.
 */
global class BankPaymentMethodRequest {

  global BankPaymentMethodRequest() {}

  public String accountHolderFirstName;

  public String accountHolderLastName;

  public String accountHolderName;

  public commercepayments.AccountHolderType accountHolderType;

  public String accountId;

  public String accountNumber;

  public commercepayments.AccountType accountType;

  public Boolean autoPay;

  public String bankCode;

  public commercepayments.BankType bankType;

  public String comments;

  public String email;

  public String mandate;

  public String nickName;

  public commercepayments.StandardEntryClassCode standardEntryClassCode;

  public Boolean equals(Object obj) {}

  public Integer hashCode() {}

  public String toString() {}

  global Object clone() {}

}