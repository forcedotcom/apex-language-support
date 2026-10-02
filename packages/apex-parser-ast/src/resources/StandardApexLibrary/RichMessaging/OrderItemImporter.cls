/**
 * Represents the importer information for an order item.
 */
global with sharing class OrderItemImporter {
    /**
     * The address variable of the importer.
     * <p>RichMessaging.Address
     */
    @InvocableVariable
    global RichMessaging.Address addressValue;
    /**
     * The country of origin variable for the imported order item.
     * <p>String
     */
    @InvocableVariable
    global String countryOfOriginValue;
    /**
     * The name variable of the importer.
     * <p>String
     */
    @InvocableVariable
    global String nameValue;

    /**
     * The address of the importer.
     * <p>RichMessaging.Address
     */
    @AuraEnabled
    global RichMessaging.Address address { get; set; }
    /**
     * The country of origin for the imported order item.
     * <p>String
     */
    @AuraEnabled
    global String countryOfOrigin { get; set; }
    /**
     * The name of the importer.
     * <p>String
     */
    @AuraEnabled
    global String name { get; set; }

    global Object OrderItemImporter() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}