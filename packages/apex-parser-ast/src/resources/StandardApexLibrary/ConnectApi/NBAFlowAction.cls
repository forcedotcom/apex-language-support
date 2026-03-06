/**
 * A recommended flow.
 */
global class NBAFlowAction {

  /**
   * Label of the recommended flow.
   */
  global String flowLabel;

  /**
   * Type of recommended flow. Values are: AutoLaunchedFlow —Autolaunched flow that runs in the background. Flow —Screen flow that accepts user inputs.
   */
  global ConnectApi.NBAFlowType flowType;

  /**
   * ID of the flow.
   */
  global String id;

  /**
   * Name of the flow.
   */
  global String name;

}