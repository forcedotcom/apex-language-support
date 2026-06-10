/**
 * Response to a publish location structure request.
 */
global class OCIPublishLocationStructureOutputRepresentation extends ConnectApi.OCIBaseOutputRepresentation {

  global OCIPublishLocationStructureOutputRepresentation() {}

  /**
   * Identifier of the publish job. Use this value to retrieve the status of the job.
   */
  global String uploadId;

  global Object clone() {}

}