/**
 * Representation of quotes associated to an account.
 */
global class CommerceQuoteCollection {

  global CommerceQuoteCollection() {}

  /**
   * Number of quotes in the current page.
   */
  global Integer count;

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Detailed error message if the retreive quotes operation was unsuccessful.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * Token identifying the next page.
   */
  global String nextPageToken;

  /**
   * URL identifying the next page.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page.
   */
  global String previousPageToken;

  /**
   * URL identifying the previous page.
   */
  global String previousPageUrl;

  /**
   * Collection of quotes associated with an user account.
   */
  global List < ConnectApi.CommerceQuoteDetail > quotes;

  global Object clone() {}

}