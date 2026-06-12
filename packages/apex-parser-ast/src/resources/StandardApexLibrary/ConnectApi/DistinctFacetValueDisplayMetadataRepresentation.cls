/**
 * Display metadata representation for a distinct facet value.
 */
global class DistinctFacetValueDisplayMetadataRepresentation {

  global DistinctFacetValueDisplayMetadataRepresentation() {}

  /**
   * Map of swatch display metadata for the distinct facet value.
   */
  global Map < String , String > swatch;

  global Object clone() {}

  global Map<String,String> getSwatch() {}

  global void setSwatch(Map<String,String> value) {}

}