/**
 * Segment dbt input.
 */
global class CdpSegmentDbtInput {

  global CdpSegmentDbtInput() {}

  /**
   * List of models. The segment data build tool currently supports a single SQL model.
   */
  global List < ConnectApi.CdpSegmentDbtModelInput > models;

  global Object clone() {}

}