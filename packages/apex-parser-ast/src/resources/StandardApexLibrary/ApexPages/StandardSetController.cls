/**
 * StandardSetController objects allow you to create list controllers similar to, or as extensions of, the pre-built Visualforce list controllers provided by Salesforce.
 * Usage
 * The StandardSetController class also contains a prototype object. This is a single sObject contained within the Visualforce StandardSetController class. If the prototype object's fields are set, those values are used during the save action, meaning that the values are applied to every record in the set controller's collection. This is useful for writing pages that perform mass updates (applying identical changes to fields within a collection of objects).
 * Note
 * Fields that are required in other Salesforce objects will keep the same requiredness when used by the prototype object.
 * Instantiation
 * You can instantiate a StandardSetController in either of the following ways:
 * From a list of sObjects:
 * List<account> accountList = [SELECT Name FROM Account LIMIT 20];
 * ApexPages.StandardSetController ssc = new ApexPages.StandardSetController(accountList);
 * From a query locator:
 * ApexPages.StandardSetController ssc =
 * new ApexPages.StandardSetController(Database.getQueryLocator([SELECT Name,CloseDate FROM Opportunity]));
 * Note
 * The maximum record limit for StandardSetController is 10,000 records. Instantiating StandardSetController using a query locator returning more than 10,000 records causes a LimitException to be thrown. However, instantiating StandardSetController with a list of more than 10,000 records doesn’t throw an exception, and instead truncates the records to the limit.
 * Example
 * The following example shows how a StandardSetController object can be used in the constructor for a custom list controller:
 * public class opportunityList2Con {
 *     // ApexPages.StandardSetController must be instantiated
 *     // for standard list controllers
 *     public ApexPages.StandardSetController setCon {
 *         get {
 *             if(setCon == null) {
 *                 setCon = new ApexPages.StandardSetController(Database.getQueryLocator(
 *                     [SELECT Name, CloseDate FROM Opportunity]));
 *             }
 *             return setCon;
 *         }
 *         set;
 *     }
 *
 *     // Initialize setCon and return a list of records
 *     public List<Opportunity> getOpportunities() {
 *         return (List<Opportunity>) setCon.getRecords();
 *     }
 * }
 * The following Visualforce markup shows how the controller above can be used in a page:
 * <apex:page controller="opportunityList2Con">
 *     <apex:pageBlock>
 *         <apex:pageBlockTable value="{!opportunities}" var="o">
 *             <apex:column value="{!o.Name}"/>
 *             <apex:column value="{!o.CloseDate}"/>
 *         </apex:pageBlockTable>
 *     </apex:pageBlock>
 * </apex:page>
 */
global class StandardSetController {
    /**
     * Creates an instance of the ApexPages.StandardSetController class for the list of objects returned by the query locator.
     */
    global StandardSetController(Database.QueryLocator queryLocator) { }

    /**
     * Creates an instance of the ApexPages.StandardSetController class for the specified list of standard or custom objects.
     * Example
     * List<account> accountList = [SELECT Name FROM Account LIMIT 20];
     * ApexPages.StandardSetController ssc = new ApexPages.StandardSetController(accountList);
     */
    global StandardSetController(List records) { }

    global void addFields(List fieldNames) { }

    /**
     * Returns the PageReference of the original page, if known, or the home page.
     */
    global System.PageReference cancel() { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Changes the set of records that the controller returns to the first page of records.
     */
    global void first() { }

    /**
     * Indicates whether there are more records in the set than the maximum record limit. If this is false, there are more records than you can process using the list controller. The maximum record limit is 10,000 records.
     */
    global Boolean getCompleteResult() { return false; }

    /**
     * Returns the ID of the filter that is currently in context.
     * Note
     * The getFilterID() method doesn’t support list views without filter IDs, such as the Recently Viewed list view. In these cases, the method returns the first filter ID of the object’s available list views. If called within an <apex:enhancedList> component, the method returns the filter ID of the last used list view.
     */
    global String getFilterId() { return null; }

    /**
     * Indicates whether there are more records after the current page set.
     */
    global Boolean getHasNext() { return false; }

    /**
     * Indicates whether there are more records before the current page set.
     */
    global Boolean getHasPrevious() { return false; }

    global List getListViewOptions() { return null; }

    /**
     * Returns the page number of the current page set. Note that the first page returns 1.
     */
    global Integer getPageNumber() { return 0; }

    /**
     * Returns the number of records included in each page set.
     */
    global Integer getPageSize() { return 0; }

    /**
     * Returns the sObject that represents the changes to the selected records. This retrieves the prototype object contained within the class, and is used for performing mass updates.
     */
    global SObject getRecord() { return null; }

    /**
     * Returns the list of sObjects in the current page set. This list is immutable, i.e. you can't call clear() on it.
     */
    global List getRecords() { return null; }

    /**
     * Returns the number of records in the set.
     */
    global Integer getResultSize() { return 0; }

    /**
     * Returns the list of sObjects that have been selected.
     */
    global List getSelected() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Changes the set of records that the controller returns to the last page of records.
     */
    global void last() { }

    /**
     * Changes the set of records that the controller returns to the next page of records.
     */
    global void next() { }

    /**
     * Changes the set of records that the controller returns to the previous page of records.
     */
    global void previous() { }

    /**
     * Inserts new records or updates existing records that have been changed. After this operation is finished, it returns a PageReference to the original page, if known, or the home page.
     */
    global System.PageReference save() { return null; }

    /**
     * Sets the filter ID of the controller.
     */
    global void setFilterId(String filterId) { }

    /**
     * Sets the page number.
     */
    global void setPageNumber(Integer pageNumber) { }

    /**
     * Sets the number of records in each page set.
     */
    global void setPageSize(Integer pageSize) { }

    /**
     * Set the selected records to the records specified in the selectedRecords argument.
     * Usage
     * Use the setSelected() method in your Apex controller or controller extension to manually set the records displayed on a Visualforce page. The setSelected() method overwrites any previously selected records with the records specified in the selectedRecords argument.
     * Example
     * AccountNamePage shows a table of account names. MyControllerExtension’s constructor contains a SOQL query that returns a list of accounts. This list is passed into setSelected() so that the account records in the list are selected and displayed in the table.
     * <!-- AccountNamePage.page -->
     * <apex:page standardController="Account" recordSetVar="accounts" extensions="MyControllerExtension">
     *     <apex:pageBlock>
     *         <apex:pageBlockTable value="{!accounts}" var="acc">
     *             <apex:column value="{!acc.name}"/>
     *         </apex:pageBlockTable>
     *     </apex:pageBlock>
     * </apex:page>
     *
     *
     * // MyControllerExtension.cls
     * public with sharing class MyControllerExtension {
     *     private ApexPages.StandardSetController setController;
     *
     *     public MyControllerExtension(ApexPages.StandardSetController setController) {
     *         this.setController = setController;
     *
     *         Account [] records = [SELECT Id, Name FROM Account LIMIT 30];
     *         setController.setSelected(records);
     *     }
     * }
     */
    global void setSelected(List selected) { }

    global String toString() { return null; }
}