/**
 * Represents the beneficiary of an order.
 */
global with sharing class OrderBeneficiary {
    @InvocableVariable
    global RichMessaging.Address addressValue;
    @InvocableVariable
    global String nameValue;
    @InvocableVariable
    global String phoneValue;

    @AuraEnabled
    global RichMessaging.Address address { get; set; }
    @AuraEnabled
    global String name { get; set; }
    @AuraEnabled
    global String phone { get; set; }

    global OrderBeneficiary() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}