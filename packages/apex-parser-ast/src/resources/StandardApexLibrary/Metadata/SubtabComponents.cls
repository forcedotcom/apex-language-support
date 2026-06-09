/**
 * Represents custom console components on subtabs in the Salesforce console.
 */
global class SubtabComponents {

  global SubtabComponents() {}

  global List<Metadata.ConsoleComponent> component;

  global List<Metadata.Container> containers;

  /**
   * Makes a duplicate copy of the Metadata.SubtabComponents .
   * @return Object
   */
  global Object clone() {}

}