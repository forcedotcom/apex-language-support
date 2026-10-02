/**
 * This class contains information about the bank payment method response. The gateway adapter reads the gateway response and generates a BankPaymentMethodResponse, populating the required fields to create a bank payment method.
 */
global with sharing class BankPaymentMethodResponse {
    global Object BankPaymentMethodResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the account holder type for the bank payment method.
     */
    global void setAccountHolderType(commercepayments.AccountHolderType accountHolderType) { }

    /**
     * Sets the Payments account ID associated with the bank payment method.
     */
    global void setAccountId(String accountId) { }

    /**
     * Sets the account type for the bank payment method.
     */
    global void setAccountType(commercepayments.AccountType accountType) { }

    /**
     * Sets the unique nine-digit code that identifies the bank code for the bank payment method.
     */
    global void setBankCode(String bankCode) { }

    /**
     * Sets the bank name for the bank payment method.
     */
    global void setBankName(String bankName) { }

    /**
     * Sets the bank type for the bank payment method.
     */
    global void setBankType(commercepayments.BankType bankType) { }

    /**
     * Sets any additional details about the bank account.
     */
    global void setComments(String comments) { }

    /**
     * Sets the email address of the bank account holder.
     */
    global void setEmail(String email) { }

    /**
     * Sets the gateway token value that the gateway returned.
     */
    global void setGatewayToken(String gatewayToken) { }

    /**
     * Sets any additional information that the gateway returned about the payment token.
     */
    global void setGatewayTokenDetails(String gatewayTokenDetails) { }

    /**
     * Sets the last four digits of the bank account number.
     */
    global void setLast4(String lastFour) { }

    /**
     * Sets the name of the account holder for the bank payment method.
     */
    global void setName(String name) { }

    /**
     * Sets the saved payment method ID for the bank account holder.
     */
    global void setSavedPaymentMethodId(String savedPaymentMethodId) { }

    /**
     * Sets the code that identifies the type of electronic payment transaction being processed within the Automated Clearing House (ACH) network.
     */
    global void setStandardEntryClassCode(commercepayments.StandardEntryClassCode standardEntryClassCode) { }

    global override virtual String toString() { return null; }
}