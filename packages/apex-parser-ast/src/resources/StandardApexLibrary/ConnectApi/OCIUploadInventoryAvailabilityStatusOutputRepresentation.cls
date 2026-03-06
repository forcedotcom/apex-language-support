/**
 * Detailed status of an upload inventory availability job.
 */
global class OCIUploadInventoryAvailabilityStatusOutputRepresentation {

  /**
   * The UTC time when the job finished. (for example: "2020-07-06T22:54:08.012Z")
   */
  global String endTimeUTC;

  /**
   * The number of records processed by the job.
   */
  global Integer recordsProcessedCount;

  /**
   * The number of records read by the job.
   */
  global Integer recordsReadCount;

  /**
   * The number of records skipped by the job.
   */
  global Integer recordsSkippedCount;

  /**
   * The UTC time when the job started. (for example: "2020-07-06T22:53:06.788Z")
   */
  global String startTimeUTC;

  /**
   * The overall status of the inventory availability upload (e.g. "PENDING", "COMPLETED").
   */
  global String status;

  /**
   * Identifier of the job.
   */
  global String uploadId;

  /**
   * List of any validation errors returned by the job.
   */
  global List < String > validationErrors;

  /**
   * The validation status of the job.
   */
  global String validationStatus;

}