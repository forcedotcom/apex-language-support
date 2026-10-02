/**
 * IdeaStandardSetController objects offer Ideas-specific functionality in addition to what is provided by the StandardSetController.
 * <p>Usage
 * Note
 * The IdeaStandardSetController and IdeaStandardController classes are currently available through a limited release program. For information on enabling these classes for your organization, contact your Salesforce representative.
 * In addition to the method listed above, the IdeaStandardSetController class inherits the methods associated with the StandardSetController.
 * Note
 * The methods inherited from the StandardSetController cannot be used to affect the list of ideas returned by the getIdeaList method.
 * <p>Instantiation
 * An IdeaStandardSetController object cannot be instantiated. An instance can be obtained through a constructor of a custom extension controller when using the standard list controller for ideas.
 * <p>Example: Displaying a Profile Page
 * The following example shows how an IdeaStandardSetController object can be used in the constructor for a custom list controller:
 * public class MyIdeaProfileExtension {
 *     private final ApexPages.IdeaStandardSetController ideaSetController;
 *
 *     public MyIdeaProfileExtension(ApexPages.IdeaStandardSetController controller) {
 *         ideaSetController = (ApexPages.IdeaStandardSetController)controller;
 *     }
 *
 *     public List<Idea> getModifiedIdeas() {
 *         Idea[] ideas = ideaSetController.getIdeaList();
 *         // modify ideas here
 *         return ideas;
 *     }
 *
 * }
 * The following Visualforce markup shows how the IdeaStandardSetController example shown above and the <ideas:profileListOutputLink> component can display a profile page that lists the recent replies, submitted ideas, and votes associated with a user. Because this example does not identify a specific user ID, the page automatically shows the profile page for the current logged in user. This page must be named profilePage in order for this example to work:
 * <!-- page named profilePage -->
 * <apex:page standardController="Idea" extensions="MyIdeaProfileExtension" recordSetVar="ideaSetVar">
 *     <apex:pageBlock >
 *         <ideas:profileListOutputLink sort="recentReplies" page="profilePage">
 *           Recent Replies</ideas:profileListOutputLink>
 *         |
 *         <ideas:profileListOutputLink sort="ideas" page="profilePage">Ideas Submitted
 *         </ideas:profileListOutputLink>
 *         |
 *         <ideas:profileListOutputLink sort="votes" page="profilePage">Ideas Voted
 *         </ideas:profileListOutputLink>
 *     </apex:pageBlock>
 *     <apex:pageBlock >
 *         <apex:dataList value="{!modifiedIdeas}" var="ideadata">
 *             <ideas:detailoutputlink ideaId="{!ideadata.id}" page="viewPage">
 *              {!ideadata.title}</ideas:detailoutputlink>
 *         </apex:dataList>
 *     </apex:pageBlock>
 * </apex:page>
 *
 *
 * In the previous example, the <ideas:detailoutputlink> component links to the following Visualforce markup that displays the detail page for a specific idea. This page must be named viewPage in order for this example to work:
 * <!-- page named viewPage -->
 * <apex:page standardController="Idea">
 *     <apex:pageBlock title="Idea Section">
 *         <ideas:detailOutputLink page="viewPage" ideaId="{!idea.id}">{!idea.title}
 *         </ideas:detailOutputLink>
 *         <br/><br/>
 *         <apex:outputText>{!idea.body}</apex:outputText>
 *     </apex:pageBlock>
 * </apex:page>
 * <p>Example: Displaying a List of Top, Recent, and Most Popular Ideas and Comments
 * The following example shows how an IdeaStandardSetController object can be used in the constructor for a custom list controller:
 * Note
 * You must have created at least one idea for this example to return any ideas.
 * public class MyIdeaListExtension {
 *     private final ApexPages.IdeaStandardSetController ideaSetController;
 *
 *     public MyIdeaListExtension (ApexPages.IdeaStandardSetController controller) {
 *         ideaSetController = (ApexPages.IdeaStandardSetController)controller;
 *     }
 *
 *     public List<Idea> getModifiedIdeas() {
 *         Idea[] ideas = ideaSetController.getIdeaList();
 *         // modify ideas here
 *         return ideas;
 *     }
 * }
 *
 * The following Visualforce markup shows how the IdeaStandardSetController example shown above can be used with the <ideas:listOutputLink> component to display a list of recent, top, and most popular ideas and comments. This page must be named listPage in order for this example to work:
 * <!-- page named listPage -->
 * <apex:page standardController="Idea" extensions="MyIdeaListExtension" recordSetVar="ideaSetVar">
 *     <apex:pageBlock >
 *         <ideas:listOutputLink sort="recent" page="listPage">Recent Ideas
 *         </ideas:listOutputLink>
 *         |
 *         <ideas:listOutputLink sort="top" page="listPage">Top Ideas
 *         </ideas:listOutputLink>
 *         |
 *         <ideas:listOutputLink sort="popular" page="listPage">Popular Ideas
 *         </ideas:listOutputLink>
 *         |
 *         <ideas:listOutputLink sort="comments" page="listPage">Recent Comments
 *         </ideas:listOutputLink>
 *     </apex:pageBlock>
 *     <apex:pageBlock >
 *         <apex:dataList value="{!modifiedIdeas}" var="ideadata">
 *             <ideas:detailoutputlink ideaId="{!ideadata.id}" page="viewPage">
 *              {!ideadata.title}</ideas:detailoutputlink>
 *         </apex:dataList>
 *     </apex:pageBlock>
 * </apex:page>
 *
 * In the previous example, the <ideas:detailoutputlink> component links to the following Visualforce markup that displays the detail page for a specific idea. This page must be named viewPage.
 * <!-- page named viewPage -->
 * <apex:page standardController="Idea">
 *     <apex:pageBlock title="Idea Section">
 *         <ideas:detailOutputLink page="viewPage" ideaId="{!idea.id}">{!idea.title}
 *         </ideas:detailOutputLink>
 *         <br/><br/>
 *         <apex:outputText>{!idea.body}</apex:outputText>
 *     </apex:pageBlock>
 * </apex:page>
 */
global class IdeaStandardSetController extends ApexPages.StandardSetController {
    global void addFields(List fieldNames) { }

    global System.PageReference cancel() { return null; }

    global Boolean equals(Object obj) { return false; }

    global void first() { }

    global Boolean getCompleteResult() { return false; }

    global String getFilterId() { return null; }

    global Boolean getHasNext() { return false; }

    global Boolean getHasPrevious() { return false; }

    /**
     * Returns the list of read-only ideas in the current page set.
     * <p>Usage
     * You can use the <ideas:listOutputLink>, <ideas:profileListOutputLink>, and <ideas:detailOutputLink> components to display profile pages as well as idea list and detail pages (see the examples below). The following is a list of properties returned by this method:
     * Body
     * Categories
     * Category
     * CreatedBy.CommunityNickname
     * CreatedBy.Id
     * CreatedDate
     * Id
     * LastCommentDate
     * LastComment.Id
     * LastComment.CommentBody
     * LastComment.CreatedBy.CommunityNickname
     * LastComment.CreatedBy.Id
     * NumComments
     * Status
     * Title
     * VoteTotal
     */
    global List getIdeaList() { return null; }

    global List getListViewOptions() { return null; }

    global Integer getPageNumber() { return 0; }

    global Integer getPageSize() { return 0; }

    global SObject getRecord() { return null; }

    global List getRecords() { return null; }

    global Integer getResultSize() { return 0; }

    global List getSelected() { return null; }

    global Integer hashCode() { return 0; }

    global void last() { }

    global void next() { }

    global void previous() { }

    global System.PageReference save() { return null; }

    global void setFilterId(String filterId) { }

    global void setPageNumber(Integer pageNumber) { }

    global void setPageSize(Integer pageSize) { }

    global void setSelected(List selected) { }

    global String toString() { return null; }
}