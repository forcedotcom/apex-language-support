/**
 * Contains the normalized response fields from payment gateways that are common to all the other gateway responses.
 * Usage
 * You must specify the CommercePayments namespace when creating an instance of this class. The constructor of this class takes no arguments. For example:
 * CommercePayments.AbstractResponse abr = new CommercePayments.AbstractResponse();
 * This class can’t be instantiated on its own. This class implements the GatewayResponse class. Other GatewayResponse classes extend this class to inherit common properties.
 */
global abstract with sharing class AbstractResponse implements commercepayments.GatewayResponse {
    global AbstractResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the date that the transaction occurred. Some gateways don’t send this value.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets error messages that the gateway returned for the payment request. Maximum length of 255 characters.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Sets a gateway-specific result code. The code may be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    /**
     * Sets the retry category returned by the payment gateway for the failed payment in a batch flow.
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