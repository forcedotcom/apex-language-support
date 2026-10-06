/**
 * Represents the details of a duplicate rule that detected duplicate records and information about those duplicate records.
 * Usage
 * The DuplicateResult class and its methods are available to organizations that use duplicate rules.
 * DuplicateResult is contained within DuplicateError, which is part of SaveResult. SaveResult is generated when a user attempts to save a record in Salesforce.
 * Example
 * This example shows a custom application that lets users add a contact. When a contact is saved, an alert displays if there are duplicate records.
 * The sample application consists of a Visualforce page and an Apex controller. The Visualforce page is listed first so that you can see how the page makes use of the Apex controller. Save the Apex class first before saving the Visualforce page.
 * <apex:page controller="ContactDedupeController">
 *     <apex:form >
 *         <apex:pageBlock title="Duplicate Records" rendered="{!hasDuplicateResult}">
 *             <apex:pageMessages />
 *             <apex:pageBlockTable value="{!duplicateRecords}" var="item">
 *                 <apex:column >
 *                     <apex:facet name="header">Name</apex:facet>
 *                     <apex:outputLink value="/{!item['Id']}">{!item['Name']}</apex:outputLink>
 *                 </apex:column>
 *                 <apex:column >
 *                     <apex:facet name="header">Owner</apex:facet>
 *                     <apex:outputField value="{!item['OwnerId']}"/>
 *                 </apex:column>
 *                 <apex:column >
 *                     <apex:facet name="header">Last Modified Date</apex:facet>
 *                     <apex:outputField value="{!item['LastModifiedDate']}"/>
 *                 </apex:column>
 *             </apex:pageBlockTable>
 *         </apex:pageBlock>
 *
 *         <apex:pageBlock title="Contact" mode="edit">
 *             <apex:pageBlockButtons >
 *                 <apex:commandButton value="Save" action="{!save}"/>
 *             </apex:pageBlockButtons>
 *
 *             <apex:pageBlockSection >
 *                 <apex:inputField value="{!Contact.FirstName}"/>
 *                 <apex:inputField value="{!Contact.LastName}"/>
 *                 <apex:inputField value="{!Contact.Email}"/>
 *                 <apex:inputField value="{!Contact.Phone}"/>
 *                 <apex:inputField value="{!Contact.AccountId}"/>
 *             </apex:pageBlockSection>
 *         </apex:pageBlock>
 *     </apex:form>
 * </apex:page>
 * This sample is the Apex controller for the page. This controller contains the action method for the Save button. The save method inserts the new contact. If errors are returned, this method iterates through each error, checks if it’s a duplicate error, adds the error message to the page, and returns information about the duplicate records to be displayed on the page.
 * public class ContactDedupeController {
 *
 *     // Initialize a variable to hold the contact record you're processing
 *     private final Contact contact;
 *
 *     // Initialize a list to hold any duplicate records
 *     private List<sObject> duplicateRecords;
 *
 *     // Define variable that’s true if there are duplicate records
 *     public boolean hasDuplicateResult{get;set;}
 *
 *     // Define the constructor
 *     public ContactDedupeController() {
 *
 *         // Define the values for the contact you’re processing based on its ID
 *         Id id = ApexPages.currentPage().getParameters().get('id');
 *         this.contact = (id == null) ? new Contact() :
 *             [SELECT Id, FirstName, LastName, Email, Phone, AccountId
 *              FROM Contact WHERE Id = :id];
 *
 *         // Initialize empty list of potential duplicate records
 *         this.duplicateRecords = new List<sObject>();
 *         this.hasDuplicateResult = false;
 *     }
 *
 *     // Return contact and its values to the Visualforce page for display
 *     public Contact getContact() {
 *         return this.contact;
 *     }
 *
 *     // Return duplicate records to the Visualforce page for display
 *     public List<sObject> getDuplicateRecords() {
 *         return this.duplicateRecords;
 *     }
 *
 *     // Process the saved record and handle any duplicates
 *     public PageReference save() {
 *
 *         // Optionally, set DML options here, use “DML” instead of “false”
 *         //   in the insert()
 *         // Database.DMLOptions dml = new Database.DMLOptions();
 *         // dml.DuplicateRuleHeader.allowSave = true;
 *         // dml.DuplicateRuleHeader.runAsCurrentUser = true;
 *         Database.SaveResult saveResult = Database.insert(contact, false);
 *
 *         if (!saveResult.isSuccess()) {
 *             for (Database.Error error : saveResult.getErrors()) {
 *                 // If there are duplicates, an error occurs
 *                 // Process only duplicates and not other errors
 *                 //   (e.g., validation errors)
 *                 if (error instanceof Database.DuplicateError) {
 *                     // Handle the duplicate error by first casting it as a
 *                     //   DuplicateError class
 *                     // This lets you use methods of that class
 *                     //  (e.g., getDuplicateResult())
 *                     Database.DuplicateError duplicateError =
 *                             (Database.DuplicateError)error;
 *                     Datacloud.DuplicateResult duplicateResult =
 *                             duplicateError.getDuplicateResult();
 *
 *                     // Display duplicate error message as defined in the duplicate rule
 *                     ApexPages.Message errorMessage = new ApexPages.Message(
 *                             ApexPages.Severity.ERROR, 'Duplicate Error: ' +
 *                             duplicateResult.getErrorMessage());
 *                     ApexPages.addMessage(errorMessage);
 *
 *                     // Get duplicate records
 *                     this.duplicateRecords = new List<sObject>();
 *
 *                     // Return only match results of matching rules that
 *                     //  find duplicate records
 *                     Datacloud.MatchResult[] matchResults =
 *                             duplicateResult.getMatchResults();
 *
 *                     // Just grab first match result (which contains the
 *                     //   duplicate record found and other match info)
 *                     Datacloud.MatchResult matchResult = matchResults[0];
 *
 *                     Datacloud.MatchRecord[] matchRecords = matchResult.getMatchRecords();
 *
 *                     // Add matched record to the duplicate records variable
 *                     for (Datacloud.MatchRecord matchRecord : matchRecords) {
 *                         System.debug('MatchRecord: ' + matchRecord.getRecord());
 *                         this.duplicateRecords.add(matchRecord.getRecord());
 *                     }
 *                     this.hasDuplicateResult = !this.duplicateRecords.isEmpty();
 *                 }
 *             }
 *
 *             //If there’s a duplicate record, stay on the page
 *             return null;
 *         }
 *
 *         //  After save, navigate to the view page:
 *         return (new ApexPages.StandardController(contact)).view();
 *     }
 *
 * }
 */
global class DuplicateResult {
    global Boolean allowsave { get; }
    global String duplicaterule { get; }
    global String duplicateruleentitytype { get; }
    global String errormessage { get; }
    global List matchresults { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the developer name of the executed duplicate rule that returned duplicate records.
     */
    global String getDuplicateRule() { return null; }

    global String getDuplicateRuleEntityType() { return null; }

    /**
     * Returns the error message configured by the administrator to warn users they may be creating duplicate records. This message is associated with a duplicate rule.
     * Example
     * This example shows the code used to display the error message when duplicates are found while saving a new contact. This code is part of a custom application that lets users add a contact. When a contact is saved, an alert displays if there are duplicate records. Review DuplicateResult Class to check out the entire sample applicaton.
     * ApexPages.Message errorMessage = new ApexPages.Message(
     *                             ApexPages.Severity.ERROR, 'Duplicate Error: ' +
     *                             duplicateResult.getErrorMessage());
     *                     ApexPages.addMessage(errorMessage);
     */
    global String getErrorMessage() { return null; }

    /**
     * Returns the duplicate records and match information.
     * Example
     * This example shows the code used to return duplicate record and match information and assign it to the matchResults variable. This code is part of a custom application that implements duplicate management when users add a contact. See DuplicateResult Class to check out the entire sample applicaton.
     * Datacloud.MatchResult[] matchResults =
     *                             duplicateResult.getMatchResults();
     */
    global List getMatchResults() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Indicates whether the duplicate rule will allow a record that’s identified as a duplicate to be saved. Set to true if duplicate rule should allow save; otherwise, false.
     */
    global Boolean isAllowSave() { return false; }

    global String toString() { return null; }
}