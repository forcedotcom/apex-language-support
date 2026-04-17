/**
 * Segment input.
 */
global class CdpSegmentInput {

  /**
   * Map of additional metadata.
   */
  global Map < String , String > additionalMetadata;

  /**
   * Segment dataspace. In API version 59.0 and later, this property is not available. Use the dataspace request parameter instead.
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
   * Segment data build tool.
   */
  global ConnectApi.CdpSegmentDbtInput includeDbt;

  /**
   * Publish refresh schedule. Values are: One —Refreshes every hour. Used to rapidly publish UI and DBT-based segments. Four —Refreshes every four hours. Used to rapidly publish UI and DBT-based segments. Twelve —Refreshes every twelve hours. TwentyFour —Refreshes every twenty-four hours.
   */
  global ConnectApi.PublishSchedule publishSchedule;

  /**
   * Date indicating the end of the publish schedule.
   */
  global String publishScheduleEndDate;

  /**
   * Datetime indicating the start of the publish schedule.
   */
  global String publishScheduleStartDateTime;

  /**
   * API name of the SegmentOn entity.
   */
  global String segmentOnApiName;

  /**
   * Type of segment. Value is: Dbt —Data build tool After a segment is created, the segment type can’t be changed.
   */
  global ConnectApi.SegmentType segmentType;

}