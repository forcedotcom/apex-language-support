/**
 * Search query metadata related to the object.
 */
global class ObjectQueryInfo {

  /**
   * Fields to display from the response.
   */
  global List < String > displayFields;

  /**
   * Specifies whether there are more records to fetch matching the search query for the object ( true ) or not ( false ).
   */
  global Boolean hasMoreResults;

  /**
   * Name field identifier of the object.
   */
  global String nameField;

  /**
   * Number of results for the object matching the search query.
   */
  global Integer numberOfMatches;

  /**
   * Applied order for object search.
   */
  global List < ConnectApi.SearchAppliedOrderBy > orderBy;

  /**
   * Source name for the object.
   */
  global String source;

  /**
   * Spell correction information for the object search.
   */
  global ConnectApi.SpellCorrectionInfo spellCorrectionInfo;

  /**
   * Status on the object search such as error messages and warnings.
   */
  global ConnectApi.SearchStatus status;

}