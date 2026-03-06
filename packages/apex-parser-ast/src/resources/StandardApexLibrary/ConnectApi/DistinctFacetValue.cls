/**
 * Distinct facet value.
 */
global class DistinctFacetValue {

  /**
   * Map of metadata required for rendering the facet value.
   */
  global ConnectApi.DistinctFacetValueDisplayMetadataRepresentation displayMetadata;

  /**
   * Display name of the facet value.
   */
  global String displayName;

  /**
   * Developer name of the attribute.
   */
  global String nameOrId;

  /**
   * Number of products in the search result that match the facet value.
   */
  global Long productCount;

}