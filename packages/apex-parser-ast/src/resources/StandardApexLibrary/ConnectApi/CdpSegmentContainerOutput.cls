/**
 * Segment container.
 */
global class CdpSegmentContainerOutput {

  /**
   * Number of items returned.
   */
  global Integer batchSize;

  /**
   * Number of rows skipped before returning results.
   */
  global Integer offset;

  /**
   * Expression indicating how results are ordered.
   */
  global String orderByExpression;

  /**
   * List of segments.
   */
  global List < ConnectApi.CdpSegmentOutput > segments;

}