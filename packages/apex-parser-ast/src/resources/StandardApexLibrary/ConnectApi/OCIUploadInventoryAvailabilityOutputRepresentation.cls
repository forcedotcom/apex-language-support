/**
 * Response to an upload inventory availability job.
 */
global class OCIUploadInventoryAvailabilityOutputRepresentation extends ConnectApi.OCIBaseOutputRepresentation {

  global OCIUploadInventoryAvailabilityOutputRepresentation() {}

  /**
   * Identifier of the upload job. Use this value to retrieve the status of the job.
   */
  global String uploadId;

  global Object clone() {}

}