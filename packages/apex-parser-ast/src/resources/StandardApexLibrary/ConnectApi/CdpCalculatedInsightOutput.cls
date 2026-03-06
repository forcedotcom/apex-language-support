/**
 * Calculated insight.
 */
global class CdpCalculatedInsightOutput {

  /**
   * API name of the calculated insight.
   */
  global String apiName;

  /**
   * Status of the calculated insight.
   */
  global String calculatedInsightStatus;

  /**
   * Creation type of the calculated insight.
   */
  global String creationType;

  /**
   * Data space of the calculated insight.
   */
  global String dataSpace;

  /**
   * Definition status of the calculated insight.
   */
  global String definitionStatus;

  /**
   * Definition type of the calculated insight.
   */
  global String definitionType;

  /**
   * Description of the calculated insight.
   */
  global String description;

  /**
   * Dimensions of the calculated insight.
   */
  global List < ConnectApi.CdpCalculatedInsightDimension > dimensions;

  /**
   * Display name of the calculated insight.
   */
  global String displayName;

  /**
   * Expression of the calculated insight.
   */
  global String expression;

  /**
   * Specifies whether the calculated insight is enabled ( true ) or not ( false ).
   */
  global Boolean isEnabled;

  /**
   * Last calculated insight status date and time.
   */
  global String lastCalcInsightStatusDateTime;

  /**
   * Last calculated insight status error code.
   */
  global String lastCalcInsightStatusErrorCode;

  /**
   * Last run date and time of the calculated insight.
   */
  global String lastRunDateTime;

  /**
   * Last run status of the calculated insight.
   */
  global String lastRunStatus;

  /**
   * Last run status date and time of the calculated insight.
   */
  global String lastRunStatusDateTime;

  /**
   * Last run status error code of the calculated insight.
   */
  global String lastRunStatusErrorCode;

  /**
   * Measures of the calculated insight.
   */
  global List < ConnectApi.CdpCalculatedInsightMeasure > measures;

}