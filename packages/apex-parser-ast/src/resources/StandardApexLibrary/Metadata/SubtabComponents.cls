/**
 * Represents custom console components on subtabs in the Salesforce console.
 */
global class SubtabComponents {

  global SubtabComponents() {}

  public List<Metadata.ConsoleComponent> component;

  public List<Metadata.Container> containers;

  /**
   * Makes a duplicate copy of the Metadata.SubtabComponents .
   * @return Object
   */
  public Object clone() {}

}