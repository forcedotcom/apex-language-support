/**
 * Represents a shipping method listed in payment requests sent in enhanced Messaging channels.
 * <p>Example
 * public with sharing class MessagingShippingMethods {
 *
 *     @InvocableMethod
 *     public static List<List<RichMessaging.ShippingMethod>> getShippingMethods(){
 *         Double amount = 0.25;
 *         List<List<RichMessaging.ShippingMethod>> result = new List<List<RichMessaging.ShippingMethod>>();
 *
 *         List<RichMessaging.ShippingMethod> options = new List<RichMessaging.ShippingMethod>{
 *             new RichMessaging.ShippingMethod('doordash', amount, '1 hour delivery to your door', 'ddash'),
 *             new RichMessaging.ShippingMethod('UPS', amount, '2 days delivery', 'UPS')
 *         };
 *         result.add(options);
 *         return result;
 *     }
 *
 * }
 */
global with sharing class ShippingMethod {
    /**
     * The amount value of the shipping method.
     * <p>Double
     */
    @InvocableVariable
    global Double amountValue;
    /**
     * The detail value of the shipping method.
     * <p>String
     */
    @InvocableVariable
    global String detailValue;
    /**
     * The identifier value of the shipping method.
     * <p>String
     */
    @InvocableVariable
    global String identifierValue;
    /**
     * The label value of the shipping method.
     * <p>String
     */
    @InvocableVariable
    global String labelValue;

    /**
     * The amount of the shipping method.
     * <p>Double
     */
    @AuraEnabled
    global Double amount { get; set; }
    /**
     * Details about the shipping method.
     * <p>String
     */
    @AuraEnabled
    global String detail { get; set; }
    /**
     * The identifier of the shipping method.
     * <p>String
     */
    @AuraEnabled
    global String identifier { get; set; }
    /**
     * The label of the shipping method.
     * <p>String
     */
    @AuraEnabled
    global String label { get; set; }
    /**
     * The shipping method type. Read only.
     * <p>String
     */
    @AuraEnabled
    global String shippingMethodType { get; }

    /**
     * Creates a new instance of the RichMessaging.ShippingMethod class.
     */
    global Object ShippingMethod() { return null; }

    /**
     * Creates a new instance of the RichMessaging.ShippingMethod class.
     */
    global Object ShippingMethod(String label, Double amount, String detail, String identifier) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}