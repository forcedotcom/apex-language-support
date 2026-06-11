/**
 * Represents a specific custom console component to display in a container that hosts multiple components in one of the sidebars of the Salesforce console.
 */
global class SidebarComponent {

  global SidebarComponent() {}

  global String componentType;

  global String createAction;

  global Boolean enableLinking;

  global Integer height;

  global Boolean knowledgeOneEnable;

  global String label;

  global String lookup;

  global String page_x;

  global List<Metadata.RelatedList> relatedLists;

  global String unit;

  global String updateAction;

  global Integer width;

  /**
   * Makes a duplicate copy of the Metadata.SidebarComponent .
   * @return Object
   */
  global Object clone() {}

}