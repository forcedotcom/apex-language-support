/**
 * Segment dbt model input.
 */
global class CdpSegmentDbtModelInput {

  /**
   * Dbt model name.
   */
  global String name;

  /**
   * Dbt SQL. Dbt SQL date strings must be in ISO 8601 format , for example, 2011-02-25T18:24:31.000Z. For details about supported validations, see Supported Validations for Segment Data Build Tool Model SQL .
   */
  global String sql;

}