/**
 * Sends data related to a bank payment method to a gateway adapter during a service call.
 * <p>Usage
 * Use the BankPaymentMethodRequest class to include bank payment details in a Tokenize request. The gateway adapter reads the fields from this class when constructing the tokenized JSON request for the payment gateway. You can create an instance of this class by calling bankPaymentMethod on the PaymentMethodTokenizationRequest class.
 * <p>Example
 * private String buildTokenizationRequest(commercepayments.PaymentMethodTokenizationRequest tokenizeRequest) {
 *     commercepayments.BankPaymentMethodRequest bankPaymentMethod = tokenizeRequest.bankPaymentMethod;
 *
 *     // Setup currency
 *     String currencyIso = UserInfo.getDefaultCurrency();
 *
 *     String accountId;
 *     JSONGenerator jsonGeneratorInstance = JSON.createGenerator(true);
 *     jsonGeneratorInstance.writeStartObject();
 *
 *     // Basic fields
 *     jsonGeneratorInstance.writeStringField('merchantAccount', '{!$Credential.Username}');
 *     jsonGeneratorInstance.writeStringField('reference', 'Tokenize_' + String.valueOf(Datetime.now().getTime()));
 *
 *     // Payment method details (from encrypted form input)
 *     jsonGeneratorInstance.writeFieldName('paymentMethod');
 *     jsonGeneratorInstance.writeStartObject();
 *
 *     if (bankPaymentMethod != null) {
 *         accountId = bankPaymentMethod.accountId;
 *         if (bankPaymentMethod.bankType.equals(commercepayments.BankType.Ach)) {
 *             currencyIso = 'USD';
 *             jsonGeneratorInstance.writeStringField('type', 'ach');
 *             jsonGeneratorInstance.writeStringField('bankAccountNumber', bankPaymentMethod.accountNumber);
 *             jsonGeneratorInstance.writeStringField('bankLocationId', bankPaymentMethod.bankCode);
 *             jsonGeneratorInstance.writeStringField('ownerName', bankPaymentMethod.accountHolderName);
 *
 *         } else if (bankPaymentMethod.bankType.equals(commercepayments.BankType.SepaDebit)) {
 *
 *             currencyIso = 'EUR';
 *             jsonGeneratorInstance.writeStringField('type', 'sepadirectdebit');
 *             jsonGeneratorInstance.writeStringField('iban', bankPaymentMethod.accountNumber);
 *             jsonGeneratorInstance.writeStringField('ownerName', bankPaymentMethod.accountHolderName);
 *
 *         } else if (bankPaymentMethod.bankType.equals(commercepayments.BankType.Bacs)) {
 *
 *             currencyIso = 'GBP';
 *             jsonGeneratorInstance.writeStringField('type', 'directdebit_GB');
 *             jsonGeneratorInstance.writeStringField('bankAccountNumber', bankPaymentMethod.accountNumber);
 *             jsonGeneratorInstance.writeStringField('bankLocationId', bankPaymentMethod.bankCode);
 *             jsonGeneratorInstance.writeStringField('holderName', bankPaymentMethod.accountHolderName);
 *
 *         } else if (bankPaymentMethod.bankType.equals(commercepayments.BankType.Becs)) {
 *
 *             currencyIso = 'AUD';
 *             jsonGeneratorInstance.writeStringField('type', 'directdebit_AU');
 *             jsonGeneratorInstance.writeStringField('bankAccountNumber', bankPaymentMethod.accountNumber);
 *             jsonGeneratorInstance.writeStringField('bsb', bankPaymentMethod.bankCode);
 *             jsonGeneratorInstance.writeStringField('ownerName', bankPaymentMethod.accountHolderName);
 *
 *         } else {
 *             //Add support for other banks if required in future.
 *         }
 *
 *         jsonGeneratorInstance.writeEndObject();
 *     }
 *
 *     // Zero-dollar amount
 *     jsonGeneratorInstance.writeFieldName('amount');
 *     jsonGeneratorInstance.writeStartObject();
 *     jsonGeneratorInstance.writeNumberField('value', 0);
 *     jsonGeneratorInstance.writeStringField('currency', currencyIso);
 *     jsonGeneratorInstance.writeEndObject();
 *
 *     // Save payment method for later
 *     jsonGeneratorInstance.writeStringField('shopperReference', accountId);
 *     jsonGeneratorInstance.writeBooleanField('storePaymentMethod', true);
 *     jsonGeneratorInstance.writeStringField('shopperInteraction', 'Ecommerce');
 *     jsonGeneratorInstance.writeStringField('recurringProcessingModel', 'UnscheduledCardOnFile');
 *
 *     commercepayments.AddressRequest billingAddress = tokenizeRequest.address;
 *
 *     if (billingAddress != null) {
 *         jsonGeneratorInstance.writeFieldName('billingAddress');
 *         jsonGeneratorInstance.writeStartObject();
 *         jsonGeneratorInstance.writeStringField('street', billingAddress.street);
 *         jsonGeneratorInstance.writeStringField('stateOrProvince', billingAddress.state);
 *         jsonGeneratorInstance.writeStringField('city', billingAddress.city);
 *         jsonGeneratorInstance.writeStringField('postalCode', billingAddress.postalCode);
 *         jsonGeneratorInstance.writeStringField('country', billingAddress.country);
 *         jsonGeneratorInstance.writeEndObject();
 *
 *     }
 *     jsonGeneratorInstance.writeEndObject();
 *     return jsonGeneratorInstance.getAsString();
 * }
 */
global with sharing class BankPaymentMethodRequest extends commercepayments.BasePaymentMethodRequest {
    /**
     * The first name of the account holder for the bank payment method.
     * <p>String
     */
    global String accountHolderFirstName { get; set; }
    /**
     * The last name of the account holder for the bank payment method.
     * <p>String
     */
    global String accountHolderLastName { get; set; }
    /**
     * The name of the account holder for the bank payment method.
     * <p>String
     */
    global String accountHolderName { get; set; }
    /**
     * The type of the account holder.
     * <p>commercepayments.AccountHolderType
     */
    global commercepayments.AccountHolderType accountHolderType { get; set; }
    /**
     * Salesforce Payments account ID associated with the bank payment method.
     * <p>String
     */
    global String accountId { get; set; }
    /**
     * The unique account number for the bank account.
     * <p>String
     */
    global String accountNumber { get; set; }
    /**
     * The type for the bank account.
     * <p>commercepayments.AccountType
     */
    global commercepayments.AccountType accountType { get; set; }
    /**
     * Indicates whether a token for recurring payments is being requested (true) or not (false). The token enables the payment method to be used for recurring payments.
     * <p>Boolean
     */
    global Boolean autoPay { get; set; }
    /**
     * The routing number is a unique nine-digit code that identifies the bank.
     * <p>String
     */
    global String bankCode { get; set; }
    /**
     * The bank type associated with the bank payment method.
     * <p>commercepayments.BankType
     */
    global commercepayments.BankType bankType { get; set; }
    /**
     * Additional details about the bank account.
     * <p>String
     */
    global String comments { get; set; }
    /**
     * The email address of the bank account holder.
     * <p>String
     */
    global String email { get; set; }
    /**
     * Authorization from the account holder to debit their payment method.
     * <p>String
     */
    global String mandate { get; set; }
    /**
     * The nick name of the account holder.
     * <p>String
     */
    global String nickName { get; set; }
    /**
     * The three-letter code that identifies the type of electronic payment transaction being processed within the Automated Clearing House (ACH) network.
     * <p>commercepayments.StandardEntryClassCode
     */
    global commercepayments.StandardEntryClassCode standardEntryClassCode { get; set; }

    global Object BankPaymentMethodRequest() { return null; }

    /**
     * Maintains the integrity of lists of type BankPaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type BankPaymentMethodRequest.
     */
    global override virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}