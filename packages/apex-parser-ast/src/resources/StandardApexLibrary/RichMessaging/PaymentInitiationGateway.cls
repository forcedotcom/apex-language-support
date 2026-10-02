/**
 * Represents gateway-specific payment initiation details.
 */
global with sharing class PaymentInitiationGateway {
    @InvocableVariable
    global String configurationIdValue;
    @InvocableVariable
    global String hostedLinkUrlValue;
    @InvocableVariable
    global List methodHintsValue;
    @InvocableVariable
    global String paymentConfigurationNameValue;
    @InvocableVariable
    global String providerNameValue;
    @InvocableVariable
    global List providerParametersValue;

    @AuraEnabled
    global String configurationId { get; set; }
    @AuraEnabled
    global String hostedLinkUrl { get; set; }
    @AuraEnabled
    global List methodHints { get; set; }
    @AuraEnabled
    global String paymentConfigurationName { get; set; }
    @AuraEnabled
    global String providerName { get; set; }
    @AuraEnabled
    global List providerParameters { get; set; }

    global Object PaymentInitiationGateway() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}