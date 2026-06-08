/**
 * Represents custom console components on primary tabs in the Salesforce console.
 */
global class PrimaryTabComponents {

  global PrimaryTabComponents() {}

  public List<Metadata.ConsoleComponent> component;

  public List<Metadata.Container> containers;

  /**
   * Makes a duplicate copy of the Metadata.PrimaryTabComponents .
   * @return Object
   */
  public Object clone() {}

}