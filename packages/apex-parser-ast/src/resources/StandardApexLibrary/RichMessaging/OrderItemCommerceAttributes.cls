/**
 * Represents the commerce attributes of an order item.
 */
global with sharing class OrderItemCommerceAttributes {
    /**
     * The category variable for the order item.
     * RichMessaging.OrderItemCategory
     */
    @InvocableVariable
    global RichMessaging.OrderItemCategory categoryValue;
    /**
     * The importer variable for the order item.
     * RichMessaging.OrderItemImporter
     */
    @InvocableVariable
    global RichMessaging.OrderItemImporter importerValue;
    /**
     * The retailer ID variable for the order item.
     * String
     */
    @InvocableVariable
    global String retailerIdValue;

    /**
     * The category of the order item.
     * String
     */
    @AuraEnabled
    global String category { get; set; }
    /**
     * The importer information of the order item.
     * RichMessaging.OrderItemImporter
     */
    @AuraEnabled
    global RichMessaging.OrderItemImporter importer { get; set; }
    /**
     * The retailer ID of the order item.
     * String
     */
    @AuraEnabled
    global String retailerId { get; set; }

    global OrderItemCommerceAttributes() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}