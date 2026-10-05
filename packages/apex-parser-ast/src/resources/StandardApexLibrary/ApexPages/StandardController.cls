/**
 * Use a StandardController when defining an extension for a standard controller.
 * <p>Usage
 * StandardController objects reference the pre-built Visualforce controllers provided by Salesforce. The only time it is necessary to refer to a StandardController object is when defining an extension for a standard controller. StandardController is the data type of the single argument in the extension class constructor.
 * <p>Instantiation
 * You can instantiate a StandardController in the following way:
 * ApexPages.StandardController sc = new ApexPages.StandardController(sObject);
 * <p>Example
 * The following example shows how a StandardController object can be used in the constructor for a standard controller extension:
 * public class myControllerExtension {
 *
 *     private final Account acct;
 *
 *     // The extension constructor initializes the private member
 *     // variable acct by using the getRecord method from the standard
 *     // controller.
 *     public myControllerExtension(ApexPages.StandardController stdController) {
 *         this.acct = (Account)stdController.getRecord();
 *     }
 *
 *     public String getGreeting() {
 *         return 'Hello ' + acct.name + ' (' + acct.id + ')';
 *     }
 * }
 * The following Visualforce markup shows how the controller extension from above can be used in a page:
 * <apex:page standardController="Account" extensions="myControllerExtension">
 *     {!greeting} <p/>
 *     <apex:form>
 *         <apex:inputField value="{!account.name}"/> <p/>
 *         <apex:commandButton value="Save" action="{!save}"/>
 *     </apex:form>
 * </apex:page>
 */
global class StandardController {
    /**
     * Creates a new instance of the ApexPages.StandardController class for the specified standard or custom object.
     */
    global StandardController(SObject sobject) { }

    /**
     * When a Visualforce page is loaded, the fields accessible to the page are based on the fields referenced in the Visualforce markup. This method adds a reference to each field specified in fieldNames so that the controller can explicitly access those fields as well.
     * <p>Usage
     * This method should be called before a record has been loaded—typically, it's called by the controller's constructor. If this method is called outside of the constructor, you must use the reset() method before calling addFields().
     * The strings in fieldNames can either be the API name of a field, such as AccountId, or they can be explicit relationships to fields, such as something__r.myField__c.
     * This method is only for controllers used by dynamicVisualforce bindings.
     */
    global void addFields(List fieldNames) { }

    /**
     * Returns the PageReference of the cancel page.
     */
    global System.PageReference cancel() { return null; }

    /**
     * Deletes record and returns the PageReference of the delete page.
     */
    global System.PageReference delete() { return null; }

    /**
     * Returns the PageReference of the standard edit page.
     */
    global System.PageReference edit() { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the ID of the record that is currently in context, based on the value of the id query string parameter in the Visualforce page URL.
     */
    global String getId() { return null; }

    /**
     * Returns the record that is currently in context, based on the value of the id query string parameter in the Visualforce page URL.
     * <p>Usage
     * Note that only the fields that are referenced in the associated Visualforce markup are available for querying on this SObject. All other fields, including fields from any related objects, must be queried using a SOQL expression.
     * Tip
     * You can work around this restriction by including a hidden component that references any additional fields that you want to query. Hide the component from display by setting the component's rendered attribute to false.
     * <p>Example
     * <apex:outputText
     * value="{!account.billingcity}
     * {!account.contacts}"
     * rendered="false"/>
     */
    global SObject getRecord() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Saves changes and returns the updated PageReference.
     */
    global System.PageReference save() { return null; }

    global String toString() { return null; }

    /**
     * Returns the PageReference object of the standard detail page.
     */
    global System.PageReference view() { return null; }
}