/**
 * Input representation for a fetch optimization files operation.
 */
global class FetchFilesInput {

  global FetchFilesInput() {}

  /**
   * The ID of the optimization request for which to retrieve the associated files.
   */
  global String optimizationRequestId;

  global Object clone() {}

}