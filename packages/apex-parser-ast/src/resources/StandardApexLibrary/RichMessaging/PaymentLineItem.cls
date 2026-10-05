/**
 * Represents a payment line item in payment requests sent in enhanced Messaging channels.
 * <p>Example
 * public with sharing class MessagingPaymentLineItems {
 *
 *     @InvocableMethod
 *     public static List<List<RichMessaging.PaymentLineItem>> getLineItems() {
 *         Double amount = 0.25;
 *         List<List<RichMessaging.PaymentLineItem>> result = new List<List<RichMessaging.PaymentLineItem>>();
 *         RichMessaging.PaymentLineItem pizza = new RichMessaging.PaymentLineItem('pizza', amount);
 *         RichMessaging.PaymentLineItem pasta = new RichMessaging.PaymentLineItem('pasta', amount);
 *         pizza.statusValue = RichMessaging.PaymentItemStatus.FinalCost;
 *         pasta.statusValue = RichMessaging.PaymentItemStatus.FinalCost;
 *
 *         List<RichMessaging.PaymentLineItem> options = new List<RichMessaging.PaymentLineItem>{
 *             pizza, pasta
 *         };
 *         result.add(options);
 *         return result;
 *     }
 *
 * }
 */
global with sharing class PaymentLineItem {
    /**
     * The amount value of the payment line item.
     * <p>Double
     */
    @InvocableVariable
    global Double amountValue;
    /**
     * The automatic reload payment threshold amount value of the payment line item.
     * <p>Double
     */
    @InvocableVariable
    global Double automaticReloadPaymentThresholdAmountValue;
    /**
     * The commerce attributes variable for the payment line item.
     * <p>RichMessaging.OrderItemCommerceAttributes
     */
    @InvocableVariable
    global RichMessaging.OrderItemCommerceAttributes commerceValue;
    /**
     * The discount variable for the payment line item.
     * <p>RichMessaging.Discount
     */
    @InvocableVariable
    global RichMessaging.Discount discountValue;
    @InvocableVariable
    global String imageValue;
    /**
     * The label value of the payment line item.
     * <p>String
     */
    @InvocableVariable
    global String labelValue;
    /**
     * The quantity variable for the payment line item.
     * <p>Integer
     */
    @InvocableVariable
    global Integer quantityValue;
    /**
     * The sale amount variable for the payment line item.
     * <p>Double
     */
    @InvocableVariable
    global Double saleAmountValue;
    /**
     * The status value of the payment line item.
     * <p>RichMessaging.PaymentItemStatus
     */
    @InvocableVariable
    global RichMessaging.PaymentItemStatus statusValue;
    /**
     * The timing value of the payment line item.
     * <p>RichMessaging.AbstractTiming
     */
    @InvocableVariable
    global RichMessaging.AbstractTiming timingValue;

    /**
     * The amount of the payment line item.
     * <p>Double
     */
    @AuraEnabled
    global Double amount { get; set; }
    /**
     * The automatic reload payment threshold amount of the payment line item.
     * <p>Double
     */
    @AuraEnabled
    global Double automaticReloadPaymentThresholdAmount { get; set; }
    /**
     * The commerce attributes of the payment line item.
     * <p>RichMessaging.OrderItemCommerceAttributes
     */
    @AuraEnabled
    global RichMessaging.OrderItemCommerceAttributes commerce { get; set; }
    /**
     * The discount applied to the payment line item.
     * <p>RichMessaging.Discount
     */
    @AuraEnabled
    global RichMessaging.Discount discount { get; set; }
    @AuraEnabled
    global String image { get; set; }
    /**
     * The label of the payment line item.
     * <p>String
     */
    @AuraEnabled
    global String label { get; set; }
    /**
     * The line item type of the payment line item. Read-only variable.
     * <p>String
     */
    @AuraEnabled
    global String lineItemType { get; }
    /**
     * The quantity of the payment line item.
     * <p>Integer
     */
    @AuraEnabled
    global Integer quantity { get; set; }
    /**
     * The sale amount of the payment line item.
     * <p>Double
     */
    @AuraEnabled
    global Double saleAmount { get; set; }
    /**
     * The status of the payment line item.
     * <p>String
     */
    @AuraEnabled
    global String status { get; set; }
    /**
     * The timing of the payment line item.
     * <p>RichMessaging.AbstractTiming
     */
    @AuraEnabled
    global RichMessaging.AbstractTiming timing { get; set; }

    /**
     * Creates a new instance of the RichMessaging.PaymentLineItem class.
     */
    global PaymentLineItem() { }

    /**
     * Creates a new instance of the RichMessaging.PaymentLineItem class.
     */
    global PaymentLineItem(String label, Double amount) { }

    /**
     * Creates a new instance of the RichMessaging.PaymentLineItem class.
     */
    global PaymentLineItem(String label, Double amount, RichMessaging.AbstractTiming timing) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}