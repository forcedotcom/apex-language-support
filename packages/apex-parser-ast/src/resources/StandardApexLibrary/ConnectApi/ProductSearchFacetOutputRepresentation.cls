/**
 * Product search facet value.
 */
global class ProductSearchFacetOutputRepresentation {

  /**
   * Attribute type of the facet value.
   */
  global String attributeType;

  /**
   * Display name of the facet value.
   */
  global String displayName;

  /**
   * Display rank of the facet value.
   */
  global Integer displayRank;

  /**
   * Display type of the facet value.
   */
  global String displayType;

  /**
   * Type of the facet.
   */
  global String facetType;

  /**
   * Name or ID of the facet.
   */
  global String nameOrId;

  /**
   * A list of facet values for the search.
   */
  global List < ConnectApi.ProductSearchFacetValueOutputRepresentation > values;

}