/**
 * Lists all contacts that were purchased in the specific order, page URLs, and the number of contacts in the order.
 */
global class DatacloudContacts {

  /**
   * A detailed list of purchased contacts.
   */
  global List < ConnectApi.DatacloudContact > contacts;

  /**
   * URL to the current page of contacts.
   */
  global String currentPageUrl;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page of contacts. This value is null if there is no previous page.
   */
  global String previousPageUrl;

  /**
   * Number of contacts that are associated with this order. Can be greater than the number of contacts that are shown on a single page.
   */
  global Integer total;

}