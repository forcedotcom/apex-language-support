/**
 * Index information.
 */
global class CommerceSearchIndex {

  /**
   * Completion date and time of the index.
   */
  global Datetime completionDate;

  /**
   * Creation date of the index.
   */
  global Datetime createdDate;

  /**
   * Creation type of the index. Values are: Manual Scheduled
   */
  global ConnectApi.CommerceSearchIndexCreationType creationType;

  /**
   * ID of the index.
   */
  global String id;

  /**
   * Build type of the index. Values are: Full Incremental
   */
  global ConnectApi.CommerceSearchIndexBuildType indexBuildType;

  /**
   * Status of the index. Values are: Completed Failed InProgress
   */
  global ConnectApi.CommerceSearchIndexStatus indexStatus;

  /**
   * Usage of the index. Values are: Live OutOfUse
   */
  global ConnectApi.CommerceSearchIndexUsage indexUsage;

  /**
   * Specifies whether the index allows incremental indexing ( true ) or not ( false ).
   */
  global Boolean isIncrementable;

  /**
   * Catalog snapshot time of the index.
   */
  global Datetime lastCatalogSnapshotTime;

  /**
   * Detailed message for the index status.
   */
  global String message;

}