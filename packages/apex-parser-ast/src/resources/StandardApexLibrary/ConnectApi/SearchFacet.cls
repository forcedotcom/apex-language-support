/**
 * Search facet.
 */
global class SearchFacet {

  global SearchFacet() {}

  /**
   * Search attribute type. Values are: Custom PricebookEntry ProductAttribute ProductCategory Product2 Standard
   */
  global ConnectApi.CommerceSearchAttributeType attributeType;

  /**
   * Display name of the facet.
   */
  global String displayName;

  /**
   * Display rank of the facet. Valid values are from 1 through 50.
   */
  global Integer displayRank;

  /**
   * Display type of the facet. Values are: CategoryTree DatePicker MultiSelect SingleSelect
   */
  global ConnectApi.CommerceSearchFacetDisplayType displayType;

  /**
   * Search facet type. Value is: DistinctValue Range
   */
  global ConnectApi.CommerceSearchFacetType facetType;

  /**
   * Developer name of the attribute. In version 52.0 and later, the ID of the attribute isn’t supported.
   */
  global String nameOrId;

  global Object clone() {}

  global ConnectApi.CommerceSearchAttributeType getAttributeType() {}

  global String getDisplayName() {}

  global Integer getDisplayRank() {}

  global ConnectApi.CommerceSearchFacetDisplayType getDisplayType() {}

  global ConnectApi.CommerceSearchFacetType getFacetType() {}

  global String getNameOrId() {}

  global void setAttributeType(ConnectApi.CommerceSearchAttributeType value) {}

  global void setDisplayName(String value) {}

  global void setDisplayRank(Integer value) {}

  global void setDisplayType(ConnectApi.CommerceSearchFacetDisplayType value) {}

  global void setFacetType(ConnectApi.CommerceSearchFacetType value) {}

  global void setNameOrId(String value) {}

}