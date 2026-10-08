/**
 * Represents the metadata associated with a page layout.
 * Usage
 * Use this class to access layout metadata components. For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_layouts.htm" target="_blank">Layout</a> in the Metadata API Developer Guide.
 */
global class Layout extends Metadata.Metadata {
    /**
     * The custom buttons for this layout.
     * List<String>
     */
    global List customButtons { get; set; }
    /**
     * Represents custom console components (Visualforce pages, lookup fields, or related lists) on a page layout.
     * CustomConsoleComponents Class
     */
    global Metadata.CustomConsoleComponents customConsoleComponents { get; set; }
    /**
     * Default value for the email checkbox. Only relevant if the showEmailCheckbox property is set.
     * Boolean
     */
    global Boolean emailDefault { get; set; }
    /**
     * List of standard buttons to exclude from this layout.
     * List<String>
     */
    global List excludeButtons { get; set; }
    /**
     * Represents the values that define the feed view of a feed-based page layout.
     * Metadata.FeedLayout
     */
    global Metadata.FeedLayout feedLayout { get; set; }
    global String fullName { get; set; }
    /**
     * Represents the layout headers used for tagging.
     * List<Metadata.LayoutHeader>
     */
    global List headers { get; set; }
    /**
     * The main sections of the layout containing fields, s-controls, and custom links. The order here determines the layout order.
     * List<Metadata.LayoutSection>
     */
    global List layoutSections { get; set; }
    /**
     * Represents a minilayout, which is used in the mini view of a record in the Console tab, hover details, and event overlays.
     * Metadata.MiniLayout
     */
    global Metadata.MiniLayout miniLayout { get; set; }
    /**
     * Fields for special multiline layout fields which appear in OpportunityProduct layouts.
     * List<String>
     */
    global List multilineLayoutFields { get; set; }
    /**
     * The list of actions, and their order, that display in the Salesforce mobile action bar for the layout.
     * Metadata.PlatformActionList
     */
    global Metadata.PlatformActionList platformActionList { get; set; }
    /**
     * The list of quick actions that display in the full Salesforce site for the page layout.
     * Meatadata.QuickActionL.
     */
    global Metadata.QuickActionList quickActionList { get; set; }
    /**
     * The Related Content section of the page layout.
     * Metadata.RelatedContent
     */
    global Metadata.RelatedContent relatedContent { get; set; }
    /**
     * The related lists for the layout, listed in the order they appear in the user interface.
     * List<Metadata.RelatedListItem>
     */
    global List relatedLists { get; set; }
    /**
     * The list of related objects that appears in the mini view of the console.
     * List<String>
     */
    global List relatedObjects { get; set; }
    /**
     * Default value for the “run assignment rules” checkbox. Only relevant if the showRunAssignmentRulesCheckbox property is set.
     * Boolean
     */
    global Boolean runAssignmentRulesDefault { get; set; }
    /**
     * Controls whether to show the email checkbox. Only allowed on Case, CaseClose, and Task layouts. The default state of checkbox is controlled by the emailDefault property.
     * Boolean
     */
    global Boolean showEmailCheckbox { get; set; }
    /**
     * If set, the highlights panel displays on pages in the Salesforce console.
     * Boolean
     */
    global Boolean showHighlightsPanel { get; set; }
    /**
     * If set, the interaction log displays on pages in the Salesforce console.
     * Boolean
     */
    global Boolean showInteractionLogPanel { get; set; }
    /**
     * Only allowed on Case layouts. If set, the Knowledge sidebar displays on cases in the Salesforce console.
     * Boolean
     */
    global Boolean showKnowledgeComponent { get; set; }
    /**
     * Controls whether to show the Run Assignment Rules checkbox. Only allowed on Lead and Case layouts. The default state of checkbox is controlled by the runAssignmentRulesDefault property.
     * Boolean
     */
    global Boolean showRunAssignmentRulesCheckbox { get; set; }
    /**
     * Only allowed on CaseClose layout. If set, the built-in solution information section shows up on the page.
     * Boolean
     */
    global Boolean showSolutionSection { get; set; }
    /**
     * For Cast layouts only. If set, the Submit & Add Attachment button displays on case edit pages to portal users in the Customer Portal.
     * Boolean
     */
    global Boolean showSubmitAndAttachButton { get; set; }
    /**
     * The summary layout for this layout.
     * Metadata.SummaryLayout
     */
    global Metadata.SummaryLayout summaryLayout { get; set; }

    global Layout() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}