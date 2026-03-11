/**
 * Record results for the keyword search.
 */
global class SearchObject {

  /**
   * Fields to display from the response.
   */
  global List < String > displayFields;

  /**
   * Object API name.
   */
  global String objectApiName;

  /**
   * Applied order for object search.
   */
  global List < ConnectApi.SearchAppliedOrderBy > orderBy;

  /**
   * Page position information for the object search.
   */
  global ConnectApi.PageInfo pageInfo;

  /**
   * Search results from the query.
   */
  global List < ConnectApi.SearchResult > searchResults;

  /**
   * Spell correction information for the object search.
   */
  global ConnectApi.SpellCorrectionInfo spellCorrectionInfo;

  /**
   * Provides status on the object search such as error messages and warnings.
   */
  global ConnectApi.SearchStatus status;

}