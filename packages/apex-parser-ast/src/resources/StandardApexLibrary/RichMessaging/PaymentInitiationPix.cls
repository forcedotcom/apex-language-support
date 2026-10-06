/**
 * Represents PIX-specific payment initiation details.
 */
global with sharing class PaymentInitiationPix {
    @InvocableVariable
    global String codeValue;
    /**
     * The PIX key type variable.
     * RichMessaging.PaymentInitiationPixKeyType
     */
    @InvocableVariable
    global RichMessaging.PaymentPixKeyType keyTypeValue;
    /**
     * The PIX key variable.
     * String
     */
    @InvocableVariable
    global String keyValue;

    @AuraEnabled
    global String code { get; set; }
    /**
     * The PIX key value.
     * String
     */
    @AuraEnabled
    global String key { get; set; }
    /**
     * The PIX key type.
     * String
     */
    @AuraEnabled
    global String keyType { get; set; }

    global PaymentInitiationPix() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}