/**
 * Segment action.
 */
global class CdpSegmentActionOutput {

  /**
   * Error code associated with the action, if any.
   */
  global String errorCode;

  /**
   * Error message associated with the action, if any.
   */
  global String errorMessage;

  /**
   * Job ID for the publish job.
   */
  global String jobId;

  /**
   * ID of the partition.
   */
  global String partitionId;

  /**
   * Publish status of the segment.
   */
  global String publishStatus;

  /**
   * API name of the segment.
   */
  global String segmentApiName;

  /**
   * ID of the segment.
   */
  global String segmentId;

}