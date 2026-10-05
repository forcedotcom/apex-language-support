/**
 * Represents the context information of an order.
 */
global with sharing class OrderContext {
    @InvocableVariable
    global List beneficiariesValue;
    @InvocableVariable
    global String catalogIdValue;
    @InvocableVariable
    global RichMessaging.PaymentCheckoutBehavior checkoutBehaviorValue;
    @InvocableVariable
    global RichMessaging.OrderExpiration expirationValue;
    @InvocableVariable
    global String referenceIdValue;
    @InvocableVariable
    global RichMessaging.OrderType typeValue;

    @AuraEnabled
    global List beneficiaries { get; set; }
    @AuraEnabled
    global String catalogId { get; set; }
    @AuraEnabled
    global String checkoutBehavior { get; set; }
    @AuraEnabled
    global RichMessaging.OrderExpiration expiration { get; set; }
    @AuraEnabled
    global String referenceId { get; set; }
    @AuraEnabled
    global String type { get; set; }

    global OrderContext() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}