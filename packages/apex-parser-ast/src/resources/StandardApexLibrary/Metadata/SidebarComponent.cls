/**
 * Represents a specific custom console component to display in a container that hosts multiple components in one of the sidebars of the Salesforce console.
 */
global class SidebarComponent {

  global SidebarComponent() {}

  public String componentType;

  public String createAction;

  public Boolean enableLinking;

  public Integer height;

  public Boolean knowledgeOneEnable;

  public String label;

  public String lookup;

  public String page_x;

  public List<Metadata.RelatedList> relatedLists;

  public String unit;

  public String updateAction;

  public Integer width;

  /**
   * Makes a duplicate copy of the Metadata.SidebarComponent .
   * @return Object
   */
  public Object clone() {}

}