/**
 * Represents the payment initiation information for an order.
 */
global with sharing class PaymentInitiation {
    /**
     * The Boleto payment initiation variable.
     * RichMessaging.PaymentInitiationBoleto
     */
    @InvocableVariable
    global RichMessaging.PaymentInitiationBoleto boletoValue;
    /**
     * The gateway payment initiation variable.
     * RichMessaging.PaymentInitiationGateway
     */
    @InvocableVariable
    global RichMessaging.PaymentInitiationGateway gatewayValue;
    @InvocableVariable
    global RichMessaging.PaymentInitiationMode modeValue;
    /**
     * The PIX payment initiation variable.
     * RichMessaging.PaymentInitiationPix
     */
    @InvocableVariable
    global RichMessaging.PaymentInitiationPix pixValue;
    @InvocableVariable
    global RichMessaging.PaymentInitiationUpi upiValue;

    /**
     * The Boleto payment initiation details.
     * RichMessaging.PaymentInitiationBoleto
     */
    @AuraEnabled
    global RichMessaging.PaymentInitiationBoleto boleto { get; set; }
    /**
     * The gateway-based payment initiation details.
     * RichMessaging.PaymentInitiationGateway
     */
    @AuraEnabled
    global RichMessaging.PaymentInitiationGateway gateway { get; set; }
    @AuraEnabled
    global String mode { get; set; }
    /**
     * The PIX payment initiation details.
     * RichMessaging.PaymentInitiationPix
     */
    @AuraEnabled
    global RichMessaging.PaymentInitiationPix pix { get; set; }
    @AuraEnabled
    global RichMessaging.PaymentInitiationUpi upi { get; set; }

    global PaymentInitiation() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}