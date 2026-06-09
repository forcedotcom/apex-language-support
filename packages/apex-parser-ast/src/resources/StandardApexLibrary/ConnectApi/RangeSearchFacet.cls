/**
 * Range facet with minimum and maximum values in product search results.
 */
global class RangeSearchFacet {

  global RangeSearchFacet() {}

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

  global Object clone() {}

  global ConnectApi.CommerceSearchAttributeType getAttributeType() {}

  global ConnectApi.RangeFacetDisplayMetadataRepresentation getDisplayMetadata() {}

  global String getDisplayName() {}

  global Integer getDisplayRank() {}

  global ConnectApi.CommerceSearchFacetDisplayType getDisplayType() {}

  global ConnectApi.CommerceSearchFacetType getFacetType() {}

  global String getMax() {}

  global String getMin() {}

  global String getNameOrId() {}

  global void setAttributeType(ConnectApi.CommerceSearchAttributeType value) {}

  global void setDisplayMetadata(ConnectApi.RangeFacetDisplayMetadataRepresentation value) {}

  global void setDisplayName(String value) {}

  global void setDisplayRank(Integer value) {}

  global void setDisplayType(ConnectApi.CommerceSearchFacetDisplayType value) {}

  global void setFacetType(ConnectApi.CommerceSearchFacetType value) {}

  global void setMax(String value) {}

  global void setMin(String value) {}

  global void setNameOrId(String value) {}

}