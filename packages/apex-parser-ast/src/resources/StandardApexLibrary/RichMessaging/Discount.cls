global with sharing class Discount {
    @InvocableVariable
    global Double amountValue;
    @InvocableVariable
    global String codeValue;
    @InvocableVariable
    global String descriptionValue;
    @InvocableVariable
    global String programNameValue;

    @AuraEnabled
    global Double amount { get; set; }
    @AuraEnabled
    global String code { get; set; }
    @AuraEnabled
    global String description { get; set; }
    @AuraEnabled
    global String programName { get; set; }

    global Object Discount() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}