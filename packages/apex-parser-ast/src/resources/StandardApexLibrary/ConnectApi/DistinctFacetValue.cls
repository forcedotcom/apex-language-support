/**
 * Distinct facet value.
 */
global class DistinctFacetValue extends ConnectApi.FacetValue {

  global DistinctFacetValue() {}

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

  global Object clone() {}

  global ConnectApi.DistinctFacetValueDisplayMetadataRepresentation getDisplayMetadata() {}

  global String getDisplayName() {}

  global String getNameOrId() {}

  global Long getProductCount() {}

  global ConnectApi.CommerceSearchFacetType getType() {}

  global void setDisplayMetadata(ConnectApi.DistinctFacetValueDisplayMetadataRepresentation value) {}

  global void setDisplayName(String value) {}

  global void setNameOrId(String value) {}

  global void setProductCount(Long value) {}

  global void setType(ConnectApi.CommerceSearchFacetType value) {}

}