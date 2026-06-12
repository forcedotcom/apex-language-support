/**
 * Display metadata representation for a range facet.
 */
global class RangeFacetDisplayMetadataRepresentation {

  global RangeFacetDisplayMetadataRepresentation() {}

  /**
   * Map of currency information display metadata for the range facet.
   */
  global Map < String , String > currencyInfo;

  global Object clone() {}

  global Map<String,String> getCurrencyInfo() {}

  global void setCurrencyInfo(Map<String,String> value) {}

}