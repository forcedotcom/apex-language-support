/**
 * Represents the activation data sources configuration output.
 */
global class ActivationDataSources {

  global ActivationDataSources() {}

  /**
   * List of activation data source configurations.
   */
  global List < ConnectApi.ActivationDataSourceConfig > dataSources;

  global Object clone() {}

}