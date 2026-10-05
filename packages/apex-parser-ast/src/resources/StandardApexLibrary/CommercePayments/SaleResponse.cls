/**
 * Response sent by payment gateway adapters for a sales service.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.SaleResponse slr CommercePayments.SaleResponse();
 * This class contains details about a customer card that was used as a payment method for Authorization, Sale, or Tokenization request. The gateway adapter reads the fields of this class while constructing a transaction JSON request, which it then sends to the payment gateway. The object of this class is made available by the cardPaymentMethod field in SaleApiPaymentMethodRequest and AuthApiPaymentMethodRequest.
 * <p>Example
 * This code sample builds a SaleResponse object.
 * commercepayments.SaleResponse saleResponse = new commercepayments.SaleResponse();
 * saleResponse.setGatewayReferenceDetails("refDetailString");
 * saleResponse.setGatewayResultCode("res_code");
 * saleResponse.setGatewayResultCodeDescription("");
 * saleResponse.setGatewayReferenceNumber("");
 * saleResponse.setSalesforceResultCodeInfo(getSalesforceResultCodeInfo(commercepayments.SalesforceResultCode.SUCCESS.name()));
 */
global class SaleResponse extends commercepayments.AbstractTransactionResponse {
    global SaleResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the transaction amount. Must be a non-negative value.
     */
    global virtual void setAmount(Double amount) { }

    /**
     * Indicates whether the gateway response is received asynchronously (true) or not (false). When set to true, the sale payment record remains in a pending state until the async notification is received.
     */
    global void setAsync(Boolean async) { }

    /**
     * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the date that the sale occurred. Some gateways don’t send this value.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets error messages that the gateway returned for the sale request. Maximum length of 255 characters.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Sets additional data that you can use for subsequent sales. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
     */
    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    /**
     * Sets the unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
     */
    global virtual void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    /**
     * Sets a gateway-specific result code. The code may be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    /**
     * Sets information from the gateway about the tokenized payment method.
     */
    global void setPaymentMethodTokenizationResponse(commercepayments.PaymentMethodTokenizationResponse paymentMethodTokenizationResponse) { }

    /**
     * Sets the retry category returned by the payment gateway for the failed payment for a batch flow.
     */
    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    /**
     * Sets the retry decision.
     */
    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global override virtual String toString() { return null; }
}