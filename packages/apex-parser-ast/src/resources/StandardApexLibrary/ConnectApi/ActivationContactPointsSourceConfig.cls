/**
 * Represents the activation contact points source configuration output.
 */
global class ActivationContactPointsSourceConfig {

  global ActivationContactPointsSourceConfig() {}

  /**
   * List of contact point source configurations.
   */
  global List < ConnectApi.ActivationContactPointSourceConfig > contactPointSources;

  global Object clone() {}

}