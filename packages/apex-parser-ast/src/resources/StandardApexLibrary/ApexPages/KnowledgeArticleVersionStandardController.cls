/**
 * KnowledgeArticleVersionStandardController objects offer article-specific functionality in addition to what is provided by the StandardController.
 * <p>Usage
 * In addition to the method listed above, the KnowledgeArticleVersionStandardController class inherits all the methods associated with StandardController.
 * Note
 * Though inherited, the edit, delete, and save methods don't serve a function when used with the KnowledgeArticleVersionStandardController class.
 * <p>Example
 * The following example shows how a KnowledgeArticleVersionStandardController object can be used to create a custom extension controller. In this example, you create a class named AgentContributionArticleController that allows customer-support agents to see pre-populated fields on the draft articles they create while closing cases.
 * Prerequisites:
 * Create an article type called FAQ. For instructions, see “Create Article Types” in the Salesforce online help.
 * Create a text custom field called Details. For instructions, see “Add Custom Fields to Article Types” in the Salesforce online help.
 * Create a category group called Geography and assign it to a category called USA. For instructions, see “Create and Modify Category Groups” and “Add Data Categories to Category Groups” in the Salesforce online help.
 * Create a category group called Topics and assign it a category called Maintenance.
 * /** Custom extension controller for the simplified article edit page that
 *     appears when an article is created on the close-case page.
 * * /
 * public class AgentContributionArticleController {
 *     // The constructor must take a ApexPages.KnowledgeArticleVersionStandardController as an argument
 *     public AgentContributionArticleController(
 *         ApexPages.KnowledgeArticleVersionStandardController ctl) {
 *         // This is the SObject for the new article.
 *         //It can optionally be cast to the proper article type.
 *         // For example, FAQ__kav article = (FAQ__kav) ctl.getRecord();
 *         SObject article = ctl.getRecord();
 *         // This returns the ID of the case that was closed.
 *         String sourceId = ctl.getSourceId();
 *         Case c = [SELECT Subject, Description FROM Case WHERE Id=:sourceId];
 *
 *         // This overrides the default behavior of pre-filling the
 *         // title of the article with the subject of the closed case.
 *         article.put('title', 'From Case: '+c.subject);
 *         article.put('details__c',c.description);
 *
 *         // Only one category per category group can be specified.
 *         ctl.selectDataCategory('Geography','USA');
 *         ctl.selectDataCategory('Topics','Maintenance');
 *     }
 * }
 *
 * /** Test class for the custom extension controller.
 * * /
 * @isTest
 * private class AgentContributionArticleControllerTest {
 *     static testMethod void testAgentContributionArticleController() {
 *          String caseSubject = 'my test';
 *          String caseDesc = 'my test description';
 *
 *          Case c = new Case();
 *          c.subject= caseSubject;
 *          c.description = caseDesc;
 *          insert c;
 *          String caseId = c.id;
 *          System.debug('Created Case: ' + caseId);
 *
 *          ApexPages.currentPage().getParameters().put('sourceId', caseId);
 *          ApexPages.currentPage().getParameters().put('sfdc.override', '1');
 *
 *          ApexPages.KnowledgeArticleVersionStandardController ctl =
 *             new ApexPages.KnowledgeArticleVersionStandardController(new FAQ__kav());
 *
 *          new AgentContributionArticleController(ctl);
 *
 *          System.assertEquals(caseId, ctl.getSourceId());
 *          System.assertEquals('From Case: '+caseSubject, ctl.getRecord().get('title'));
 *          System.assertEquals(caseDesc, ctl.getRecord().get('details__c'));
 *    }
 * }
 *
 * If you created the custom extension controller for the purpose described in the previous example (that is, to modify submitted-via-case articles), complete the following steps after creating the class:
 * Log into your Salesforce organization and from Setup, enter Knowledge Settings in the Quick Find box, then select Knowledge Settings.
 * Click Edit.
 * Assign the class to the Use Apex customization field. This associates the article type specified in the new class with the article type assigned to closed cases.
 * Click Save.
 */
global class KnowledgeArticleVersionStandardController extends ApexPages.StandardController {
    /**
     * Creates a new instance of the ApexPages.KnowledgeArticleVersionStandardController class using the specified knowledge article.
     */
    Object KnowledgeArticleVersionStandardController(SObject sobject) { return null; }

    global void addFields(List fieldNames) { }

    global System.PageReference cancel() { return null; }

    global Boolean equals(Object obj) { return false; }

    global String getId() { return null; }

    global SObject getRecord() { return null; }

    /**
     * Returns the ID for the source object record when creating a new article from another object.
     */
    global String getSourceId() { return null; }

    global Integer hashCode() { return 0; }

    global void selectDataCategory(String categoryGroup, String category) { }

    global String toString() { return null; }

    global System.PageReference view() { return null; }
}