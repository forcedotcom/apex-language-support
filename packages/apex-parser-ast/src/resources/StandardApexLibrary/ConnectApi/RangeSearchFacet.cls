/**
 * Range facet with minimum and maximum values in product search results.
 */
global class RangeSearchFacet {

  /**
   * Type of search attribute for the refinement. Values are: Custom Standard PricebookEntry
   */
  global String attributeType;

  /**
   * Metadata required for rendering the range facet.
   */
  global ConnectApi.RangeFacetDisplayMetadataRepresentation displayMetadata;

  /**
   * Display name of the facet.
   */
  global String displayName;

  /**
   * Display rank of the facet. Valid values are from 1 through 50.
   */
  global String displayRank;

  /**
   * Display type of the facet. Value is: Range
   */
  global String displayType;

  /**
   * Type of the facet. Value is: Range
   */
  global String facetType;

  /**
   * Maximum value of the facet found in the search result.
   */
  global String max;

  /**
   * Minimum value of the facet found in the search result.
   */
  global String min;

  /**
   * Developer name of the attribute for the refinement.
   */
  global String nameOrId;

}