/**
 * This class contains information about the bank payment method response. The gateway adapter reads the gateway response and generates a BankPaymentMethodResponse , populating the required fields to create a bank payment method.
 */
global class BankPaymentMethodResponse {

  global BankPaymentMethodResponse() {}

  global void setAccountHolderType(commercepayments.AccountHolderType accountHolderType) {}

  global void setAccountId(String accountId) {}

  global void setAccountType(commercepayments.AccountType accountType) {}

  global void setBankCode(String bankCode) {}

  global void setBankName(String bankName) {}

  global void setBankType(commercepayments.BankType bankType) {}

  global void setComments(String comments) {}

  global void setEmail(String email) {}

  global void setGatewayToken(String gatewayToken) {}

  global void setGatewayTokenDetails(String gatewayTokenDetails) {}

  global void setLast4(String lastFour) {}

  global void setName(String name) {}

  global void setSavedPaymentMethodId(String savedPaymentMethodId) {}

  global void setStandardEntryClassCode(commercepayments.StandardEntryClassCode standardEntryClassCode) {}

  global Object clone() {}

}