/**
 * Segment dbt pipeline.
 */
global class CdpSegmentDbtPipeline {

  global CdpSegmentDbtPipeline() {}

  /**
   * Dbt models.
   */
  global List < ConnectApi.CdpSegmentDbtModel > models;

  global Object clone() {}

}