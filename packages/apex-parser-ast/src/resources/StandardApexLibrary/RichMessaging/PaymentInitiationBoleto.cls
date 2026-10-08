/**
 * Represents Boleto-specific payment initiation details.
 */
global with sharing class PaymentInitiationBoleto {
    @InvocableVariable
    global String digitableLineValue;

    @AuraEnabled
    global String digitableLine { get; set; }

    global PaymentInitiationBoleto() { }

    global PaymentInitiationBoleto(String digitableLine) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}