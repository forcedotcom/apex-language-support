/**
 * Segment.
 */
global class CdpSegmentOutput {

  /**
   * API name of the segment.
   */
  global String apiName;

  /**
   * Data space of the segment.
   */
  global String dataSpace;

  /**
   * Segment description.
   */
  global String description;

  /**
   * Segment developer name.
   */
  global String developerName;

  /**
   * Segment display name.
   */
  global String displayName;

  /**
   * Segment exclude criteria.
   */
  global String excludeCriteria;

  /**
   * Segment include criteria.
   */
  global String includeCriteria;

  /**
   * Segment dbt pipeline.
   */
  global ConnectApi.CdpSegmentDbtPipeline includeDbt;

  /**
   * ID of the market segment definition.
   */
  global String marketSegmentDefinitionId;

  /**
   * ID of the market segment.
   */
  global String marketSegmentId;

  /**
   * Date and time of the next segment publish.
   */
  global String nextPublishDateTime;

  /**
   * Segment publish interval.
   */
  global String publishInterval;

  /**
   * Publish schedule end date.
   */
  global String publishScheduleEndDate;

  /**
   * Publish schedule start date time.
   */
  global String publishScheduleStartDateTime;

  /**
   * Segment publish status.
   */
  global String publishStatus;

  /**
   * Segment membership tables.
   */
  global ConnectApi.CdpSegmentMembershipTableOutput segmentMembershipDmo;

  /**
   * Name of the segment membership table.
   */
  global String segmentMembershipTable;

  /**
   * API name of the SegmentOn entity.
   */
  global String segmentOnApiName;

  /**
   * ID of the DMO segment.
   */
  global String segmentOnId;

  /**
   * Segment status.
   */
  global String segmentStatus;

  /**
   * Type of segment.
   */
  global String segmentType;

}