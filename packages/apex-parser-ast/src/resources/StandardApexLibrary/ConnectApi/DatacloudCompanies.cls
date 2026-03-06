/**
 * Lists all companies that were purchased in a specific order, page URLs, and the number of companies in the order.
 */
global class DatacloudCompanies {

  /**
   * A detailed list of companies that were part of a single order.
   */
  global ConnectApi.DatacloudCompany companies;

  /**
   * The URL for the current page of a list of companies.
   */
  global String currentPageUrl;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * The URL to the previous page of companies that were viewed before the current page. If this value is null , there’s no previous page.
   */
  global String previousPageUrl;

  /**
   * The number of companies in the order. You can calculate the number of pages to display by dividing this number by your page size. The default page size is 25.
   */
  global Integer total;

}