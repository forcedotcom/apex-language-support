/**
 * Response to an upload inventory availability job.
 */
global class OCIUploadInventoryAvailabilityOutputRepresentation extends ConnectApi.OCIBaseOutputRepresentation {

  /**
   * Identifier of the upload job. Use this value to retrieve the status of the job.
   */
  global String uploadId;

}