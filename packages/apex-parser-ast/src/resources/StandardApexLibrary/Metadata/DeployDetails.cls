/**
 * Contains detailed information on deployed components.
 */
global class DeployDetails {

  global DeployDetails() {}

  global List<Metadata.DeployMessage> componentFailures;

  global List<Metadata.DeployMessage> componentSuccesses;

  /**
   * Makes a duplicate copy of the Metadata.DeployDetails .
   * @return Object
   */
  global Object clone() {}

}