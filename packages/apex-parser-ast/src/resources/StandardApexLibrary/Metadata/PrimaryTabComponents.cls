/**
 * Represents custom console components on primary tabs in the Salesforce console.
 */
global class PrimaryTabComponents {

  global PrimaryTabComponents() {}

  global List<Metadata.ConsoleComponent> component;

  global List<Metadata.Container> containers;

  /**
   * Makes a duplicate copy of the Metadata.PrimaryTabComponents .
   * @return Object
   */
  global Object clone() {}

}