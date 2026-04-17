/**
 * Source information associated with a generated response.
 */
global class EinsteinLlmGenerationCitationOutput {

  /**
   * List of metadata for the sources that are cited in the generated response.
   */
  global List < ConnectApi.EinsteinLlmGenerationGenAiCitedReference > citedReferences;

  /**
   * List of sources from one or more data providers.
   */
  global List < ConnectApi.EinsteinLlmGenAiSourceReference > sourceReferences;

}