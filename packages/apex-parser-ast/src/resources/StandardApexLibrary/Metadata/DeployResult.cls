/**
 * Represents the results of a metadata deployment.
 */
global class DeployResult {

  global DeployResult() {}

  public String canceledBy;

  public String canceledByName;

  public Boolean checkOnly;

  public Datetime completedDate;

  public String createdBy;

  public String createdByName;

  public Datetime createdDate;

  public Metadata.DeployDetails details;

  public Boolean done;

  public String errorMessage;

  public String errorStatusCode;

  public Id id;

  public Boolean ignoreWarnings;

  public Datetime lastModifiedDate;

  public Integer numberComponentErrors;

  public Integer numberComponentsDeployed;

  public Integer numberComponentsTotal;

  public Boolean rollbackOnError;

  public Datetime startDate;

  public String stateDetail;

  public Metadata.DeployStatus status;

  public Boolean success;

  /**
   * Makes a duplicate copy of the Metadata.DeployResult .
   * @return Object
   */
  public Object clone() {}

}