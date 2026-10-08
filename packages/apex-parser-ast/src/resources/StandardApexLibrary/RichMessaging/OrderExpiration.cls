/**
 * Represents the expiration information of an order.
 */
global with sharing class OrderExpiration {
    @InvocableVariable
    global String descriptionValue;
    @InvocableVariable
    global Long timestampValue;

    @AuraEnabled
    global String description { get; set; }
    @AuraEnabled
    global Long timestamp { get; set; }

    global OrderExpiration() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}