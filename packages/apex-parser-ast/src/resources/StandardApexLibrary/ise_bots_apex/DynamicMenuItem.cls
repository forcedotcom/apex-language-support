/**
 * Contains properties to define and hold the details for a single dynamic menu item Each item contains information related to an object, such as identifiers, labels, summaries, and sorting logic. It enables bots to present context-aware and user-relevant choices dynamically during conversations. .
 */
global with sharing class DynamicMenuItem {
    /**
     * The ID value retrieved at run time for the associated object.
     * <p>String
     */
    @InvocableVariable
    global String EntityIdValue;
    /**
     * The name of the specific object instance.
     * <p>String
     */
    @InvocableVariable
    global String EntityNameValue;
    /**
     * The value of the label displayed to the user for the menu item at run time.
     * <p>String
     */
    @InvocableVariable
    global String LabelValue;
    /**
     * The summary string based on the formula and object data.
     * <p>String
     */
    @InvocableVariable
    global String SummaryTextWithFormulaValue;
    /**
     * The DateTime value used at run time to sort the menu items chronologically.
     * <p>Date
     */
    @InvocableVariable
    global Date sortByDateValue;

    /**
     * API name representing the ID field of the related Salesforce object.
     * <p>String
     */
    @AuraEnabled
    global String EntityId { get; set; }
    /**
     * API name or label of the object being referenced, for example Case, Contact, or a custom object such as Service__c.
     * <p>String
     */
    @AuraEnabled
    global String EntityName { get; set; }
    /**
     * The label used to define how the item must be displayed in the bot menu.
     * <p>String
     */
    @AuraEnabled
    global String Label { get; set; }
    /**
     * A formula or a string of text that defines the structure of the summary text displayed for the item. This formula is used to construct a dynamic summary for the user after they make a selection.
     * <p>String
     */
    @AuraEnabled
    global String SummaryTextWithFormula { get; set; }
    /**
     * The API name of a date or date/time field on the object that's used to sort the dynamic menu items.
     * <p>Date
     */
    @AuraEnabled
    global Date sortByDate { get; set; }

    global Object DynamicMenuItem() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}