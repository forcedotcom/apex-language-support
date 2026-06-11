/**
 * Segment dbt model.
 */
global class CdpSegmentDbtModel {

  global CdpSegmentDbtModel() {}

  /**
   * Dbt model name.
   */
  global String name;

  /**
   * Dbt model SQL.
   */
  global String sql;

  global Object clone() {}

}