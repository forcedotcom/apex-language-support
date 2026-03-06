/**
 * Output representation of a product search facet value.
 */
global class ProductSearchFacetValueOutputRepresentation {

  /**
   * Display name of the search facet.
   */
  global String displayName;

  /**
   * Unique name or ID of the search facet.
   */
  global String nameOrId;

  /**
   * Number of products found with the search facet.
   */
  global Integer productCount;

  /**
   * Type of the search facet.
   */
  global String type;

}