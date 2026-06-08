/**
 * Represents result information for the deployment of a metadata component.
 */
global class DeployMessage {

  global DeployMessage() {}

  public Boolean changed;

  public Integer columnNumber;

  public String componentType;

  public Boolean created;

  public Datetime createdDate;

  public Boolean deleted;

  public String fileName;

  public String fullName;

  public Id id;

  public Integer lineNumber;

  public String problem;

  public Metadata.DeployProblemType problemType;

  public Boolean success;

  /**
   * Makes a duplicate copy of the Metadata.DeployMessage .
   * @return Object
   */
  public Object clone() {}

}