/**
 * Represents result information for the deployment of a metadata component.
 */
global class DeployMessage {

  global DeployMessage() {}

  global Boolean changed;

  global Integer columnNumber;

  global String componentType;

  global Boolean created;

  global Datetime createdDate;

  global Boolean deleted;

  global String fileName;

  global String fullName;

  global Id id;

  global Integer lineNumber;

  global String problem;

  global Metadata.DeployProblemType problemType;

  global Boolean success;

  /**
   * Makes a duplicate copy of the Metadata.DeployMessage .
   * @return Object
   */
  global Object clone() {}

}