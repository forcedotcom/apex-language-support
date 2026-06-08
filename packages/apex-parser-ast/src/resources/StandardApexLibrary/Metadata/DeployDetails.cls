/**
 * Contains detailed information on deployed components.
 */
global class DeployDetails {

  global DeployDetails() {}

  public List<Metadata.DeployMessage> componentFailures;

  public List<Metadata.DeployMessage> componentSuccesses;

  /**
   * Makes a duplicate copy of the Metadata.DeployDetails .
   * @return Object
   */
  public Object clone() {}

}