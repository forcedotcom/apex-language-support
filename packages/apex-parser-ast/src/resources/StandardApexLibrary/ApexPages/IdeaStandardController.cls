/**
 * IdeaStandardController objects offer Ideas-specific functionality in addition to what is provided by the StandardController.
 * Usage
 * A method in the IdeaStandardController object is called by and operated on a particular instance of an IdeaStandardController.
 * Note
 * The IdeaStandardSetController and IdeaStandardController classes are currently available through a limited release program. For information on enabling these classes for your organization, contact your Salesforce representative.
 * In addition to the methods listed in this class, the IdeaStandardController class inherits all the methods associated with the StandardController class.
 * Instantiation
 * An IdeaStandardController object cannot be instantiated. An instance can be obtained through a constructor of a custom extension controller when using the standard ideas controller.
 * Example
 * The following example shows how an IdeaStandardController object can be used in the constructor for a custom list controller. This example provides the framework for manipulating the comment list data before displaying it on a Visualforce page.
 * public class MyIdeaExtension {
 *
 *     private final ApexPages.IdeaStandardController ideaController;
 *
 *     public MyIdeaExtension(ApexPages.IdeaStandardController controller) {
 *         ideaController = (ApexPages.IdeaStandardController)controller;
 *     }
 *
 *     public List<IdeaComment> getModifiedComments() {
 *         IdeaComment[] comments = ideaController.getCommentList();
 *         // modify comments here
 *         return comments;
 *     }
 *
 * }
 * The following Visualforce markup shows how the IdeaStandardController example shown above can be used in a page. This page must be named detailPage for this example to work.
 * Note
 * For the Visualforce page to display the idea and its comments, in the following example you need to specify the ID of a specific idea (for example, /apex/detailPage?id=<ideaID>) whose comments you want to view.
 * <!-- page named detailPage -->
 * <apex:page standardController="Idea" extensions="MyIdeaExtension">
 *     <apex:pageBlock title="Idea Section">
 *         <ideas:detailOutputLink page="detailPage" ideaId="{!idea.id}">{!idea.title}
 *         </ideas:detailOutputLink>
 *         <br/><br/>
 *         <apex:outputText >{!idea.body}</apex:outputText>
 *     </apex:pageBlock>
 *     <apex:pageBlock title="Comments Section">
 *         <apex:dataList var="a" value="{!modifiedComments}" id="list">
 *             {!a.commentBody}
 *         </apex:dataList>
 *         <ideas:detailOutputLink page="detailPage" ideaId="{!idea.id}"
 *                pageOffset="-1">Prev</ideas:detailOutputLink>
 *         |
 *         <ideas:detailOutputLink page="detailPage" ideaId="{!idea.id}"
 *                pageOffset="1">Next</ideas:detailOutputLink>
 *     </apex:pageBlock>
 * </apex:page>
 */
global class IdeaStandardController extends ApexPages.StandardController {
    global void addFields(List fieldNames) { }

    global System.PageReference cancel() { return null; }

    global System.PageReference delete() { return null; }

    global System.PageReference edit() { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the list of read-only comments from the current page.
     * @return This method returns the following comment properties:
     * id
     * commentBody
     * createdDate
     * createdBy.Id
     * createdBy.communityNickname
     */
    global List getCommentList() { return null; }

    global String getId() { return null; }

    global SObject getRecord() { return null; }

    global Integer hashCode() { return 0; }

    global System.PageReference save() { return null; }

    global String toString() { return null; }

    global System.PageReference view() { return null; }
}