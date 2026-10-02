global with sharing class PaymentInitiationUpi {
    @InvocableVariable
    global String intentLinkValue;
    @InvocableVariable
    global String merchantCategoryCodeValue;
    @InvocableVariable
    global String payeeHandleValue;

    @AuraEnabled
    global String intentLink { get; set; }
    @AuraEnabled
    global String merchantCategoryCode { get; set; }
    @AuraEnabled
    global String payeeHandle { get; set; }

    global Object PaymentInitiationUpi() { return null; }

    global Object PaymentInitiationUpi(String payeeHandle, String merchantCategoryCode, String intentLink) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}