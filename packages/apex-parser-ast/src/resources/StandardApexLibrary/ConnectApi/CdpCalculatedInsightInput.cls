/**
 * Input representation for a calculated insight.
 */
global class CdpCalculatedInsightInput {

  /**
   * API name of the calculated insight with suffix __cio.
   */
  global String apiName;

  /**
   * Specifies whether the calculated insight was created from an installed package ( true ) or not ( false ).
   */
  global Boolean createdFromPackage;

  /**
   * Name of the data space.
   */
  global String dataSpaceName;

  /**
   * Definition type of the calculated insight. Values are: CALCULATED_METRIC CALCULATED_METRIC CALCULATED_METRIC
   */
  global ConnectApi.CalculatedInsightDefinitionTypeEnum definitionType;

  /**
   * Calculated insight description.
   */
  global String description;

  /**
   * Calculated insight display name.
   */
  global String displayName;

  /**
   * Specifies whether to save the calculated insight as draft ( true ) or not ( false ).
   */
  global Boolean draft;

  /**
   * Calculated insight ANSI SQL expression.
   */
  global String expression;

  /**
   * API name of the packaged calculated insight.
   */
  global String packagedCalculatedInsightApiName;

}