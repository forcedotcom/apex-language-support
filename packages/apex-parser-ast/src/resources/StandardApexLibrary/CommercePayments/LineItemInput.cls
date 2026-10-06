/**
 * Sends the list of individual line items associated with the payment to the gateway adapter.
 */
global with sharing class LineItemInput {
    /**
     * Map of additional attributes.
     * Map<String,String>
     */
    @AuraEnabled
    global Map additionalAttributes { get; set; }
    /**
     * Commodity code.
     * String
     */
    @AuraEnabled
    global String commodityCode { get; set; }
    /**
     * Description of the product.
     * String
     */
    @AuraEnabled
    global String description { get; set; }
    /**
     * Discount applied to the line item level.
     * Double
     */
    @AuraEnabled
    global Double discount { get; set; }
    /**
     * Specifies whether a discount was applied to the specific line item.
     * Boolean
     */
    @AuraEnabled
    global Boolean discountIndicator { get; set; }
    /**
     * Duty or tariff applied specifically to a item (not the whole order).
     * Double
     */
    @AuraEnabled
    global Double dutyAmount { get; set; }
    /**
     * Specifies if the line item amount is Gross (before discounts) or Net (after discounts).
     * String
     */
    @AuraEnabled
    global String grossNetIndicator { get; set; }
    /**
     * Line item identifier. Specify when multiple items are present.
     * String
     */
    @AuraEnabled
    global String lineItemId { get; set; }
    /**
     * Total amount for that line item.
     * Double
     */
    @AuraEnabled
    global Double lineItemTotal { get; set; }
    /**
     * Product or service name.
     * String
     */
    @AuraEnabled
    global String name { get; set; }
    /**
     * Quantity purchased.
     * Integer
     */
    @AuraEnabled
    global Integer quantity { get; set; }
    /**
     * Shipping or freight cost allocated to that line item.
     * Double
     */
    @AuraEnabled
    global Double shippingAmount { get; set; }
    /**
     * SKU or product code.
     * String
     */
    @AuraEnabled
    global String sku { get; set; }
    /**
     * Line-level tax amount.
     * Double
     */
    @AuraEnabled
    global Double taxAmount { get; set; }
    /**
     * Tax percentage applied to that specific line item.
     * Double
     */
    @AuraEnabled
    global Double taxRate { get; set; }
    /**
     * Unit price.
     * Double
     */
    @AuraEnabled
    global Double unitPrice { get; set; }
    /**
     * Unit of measure. For example, EA, HRS, and KG.
     * String
     */
    @AuraEnabled
    global String uom { get; set; }

    global LineItemInput() { }

    /**
     * Maintains the integrity of lists of type LineItemInput by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type LineItemInput.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}