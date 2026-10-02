/**
 * Represents gateway-specific properties for a payment.
 */
global with sharing class PaymentGatewayProperties {
    @InvocableVariable
    global String keyValue;
    @InvocableVariable
    global String valueValue;

    @AuraEnabled
    global String name { get; set; }
    @AuraEnabled
    global Map value { get; set; }

    global Object PaymentGatewayProperties(String key, String value) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}