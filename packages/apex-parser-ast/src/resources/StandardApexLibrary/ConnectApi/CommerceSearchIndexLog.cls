/**
 * Search index log information.
 */
global class CommerceSearchIndexLog {

  /**
   * Catalog snapshot time of the index build.
   */
  global Datetime catalogSnapshotTime;

  /**
   * Completion date of the index build.
   */
  global Datetime completionDate;

  /**
   * ID of the user who initiated the index build.
   */
  global String createdById;

  /**
   * Status of the index. Values are: Completed Failed InProgress
   */
  global ConnectApi.CommerceSearchIndexStatus indexBuildStatus;

  /**
   * Build type of the index. Values are: Full Incremental
   */
  global ConnectApi.CommerceSearchIndexBuildType indexBuildType;

  /**
   * ID of the index build.
   */
  global String indexId;

  /**
   * Detailed message for the index build status.
   */
  global String message;

  /**
   * Number of new or changed products in the index build.
   */
  global Integer numberOfProducts;

}