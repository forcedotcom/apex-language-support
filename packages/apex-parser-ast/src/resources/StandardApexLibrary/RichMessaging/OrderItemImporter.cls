/**
 * Represents the importer information for an order item.
 */
global with sharing class OrderItemImporter {
    /**
     * The address variable of the importer.
     * RichMessaging.Address
     */
    @InvocableVariable
    global RichMessaging.Address addressValue;
    /**
     * The country of origin variable for the imported order item.
     * String
     */
    @InvocableVariable
    global String countryOfOriginValue;
    /**
     * The name variable of the importer.
     * String
     */
    @InvocableVariable
    global String nameValue;

    /**
     * The address of the importer.
     * RichMessaging.Address
     */
    @AuraEnabled
    global RichMessaging.Address address { get; set; }
    /**
     * The country of origin for the imported order item.
     * String
     */
    @AuraEnabled
    global String countryOfOrigin { get; set; }
    /**
     * The name of the importer.
     * String
     */
    @AuraEnabled
    global String name { get; set; }

    global OrderItemImporter() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}