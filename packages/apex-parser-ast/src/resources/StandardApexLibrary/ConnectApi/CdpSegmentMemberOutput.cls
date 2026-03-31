/**
 * Data 360 segment member output.
 */
global class CdpSegmentMemberOutput {

  /**
   * Result data set.
   */
  global List < ConnectApi.CdpSegmentMemberRowOutput > data;

  /**
   * Query end time.
   */
  global Datetime endTime;

  /**
   * Filter information for the query.
   */
  global String filter;

  /**
   * Batch size information.
   */
  global Integer limit;

  /**
   * URL for the next page.
   */
  global String nextPageUrl;

  /**
   * Offset information.
   */
  global Integer offSet;

  /**
   * Order by information.
   */
  global String orderBy;

  /**
   * Total row count.
   */
  global Integer rowCount;

  /**
   * Query start time.
   */
  global Datetime startTime;

  /**
   * Total count of records.
   */
  global Integer totalCount;

}