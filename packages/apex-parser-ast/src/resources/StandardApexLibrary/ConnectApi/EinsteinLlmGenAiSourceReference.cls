/**
 * Source from a data provider.
 */
global class EinsteinLlmGenAiSourceReference {

  /**
   * List of values from the source that are used for grounding a generated response.
   */
  global List < ConnectApi.EinsteinLlmGenerationGenAiSourceContentInfo > contents;

  /**
   * List of metadata for the source, such as URLs or record IDs.
   */
  global List < ConnectApi.EinsteinLlmGenerationGenAiSourceReferenceInfo > metadata;

}