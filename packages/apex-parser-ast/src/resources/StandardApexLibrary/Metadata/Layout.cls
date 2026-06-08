/**
 * Represents the metadata associated with a page layout.
 */
global class Layout {

  global Layout() {}

  public List<String> customButtons;

  public Metadata.CustomConsoleComponents customConsoleComponents;

  public Boolean emailDefault;

  public List<String> excludeButtons;

  public Metadata.FeedLayout feedLayout;

  public List<Metadata.LayoutHeader> headers;

  public List<Metadata.LayoutSection> layoutSections;

  public Metadata.MiniLayout miniLayout;

  public List<String> multilineLayoutFields;

  public Metadata.PlatformActionList platformActionList;

  public Metadata.QuickActionList quickActionList;

  public Metadata.RelatedContent relatedContent;

  public List<Metadata.RelatedListItem> relatedLists;

  public List<String> relatedObjects;

  public Boolean runAssignmentRulesDefault;

  public Boolean showEmailCheckbox;

  public Boolean showHighlightsPanel;

  public Boolean showInteractionLogPanel;

  public Boolean showKnowledgeComponent;

  public Boolean showRunAssignmentRulesCheckbox;

  public Boolean showSolutionSection;

  public Boolean showSubmitAndAttachButton;

  public Metadata.SummaryLayout summaryLayout;

  /**
   * Makes a duplicate copy of the Metadata.Layout .
   * @return Object
   */
  public Object clone() {}

}