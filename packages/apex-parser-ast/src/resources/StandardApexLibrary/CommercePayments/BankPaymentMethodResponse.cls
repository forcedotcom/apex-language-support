/**
 * This class contains information about the bank payment method response. The gateway adapter reads the gateway response and generates a BankPaymentMethodResponse , populating the required fields to create a bank payment method.
 */
global class BankPaymentMethodResponse {

  public void setAccountHolderType(commercepayments.AccountHolderType accountHolderType) {}

  public void setAccountId(String accountId) {}

  public void setAccountType(commercepayments.AccountType accountType) {}

  public void setBankCode(String bankCode) {}

  public void setBankName(String bankName) {}

  public void setBankType(commercepayments.BankType bankType) {}

  public void setComments(String comments) {}

  public void setEmail(String email) {}

  public void setGatewayToken(String gatewayToken) {}

  public void setGatewayTokenDetails(String gatewayTokenDetails) {}

  public void setLast4(String lastFour) {}

  public void setName(String name) {}

  public void setSavedPaymentMethodId(String savedPaymentMethodId) {}

  public void setStandardEntryClassCode(commercepayments.StandardEntryClassCode standardEntryClassCode) {}

}