/**
 * A collection of Commerce addresses.
 */
global class CommerceAddressCollection {

  /**
   * Count of addresses.
   */
  global Integer count;

  /**
   * Token to the current page of addresses.
   */
  global String currentPageToken;

  /**
   * URL to the current page of addresses.
   */
  global String currentPageUrl;

  /**
   * Address Details
   */
  global List < ConnectApi.CommerceAddressOutput > items;

  /**
   * Token to the next page of addresses.
   */
  global String nextPageToken;

  /**
   * URL to the next page of addresses.
   */
  global String nextPageUrl;

  /**
   * Page size for addresses.
   */
  global Integer pageSize;

  /**
   * Token to previous page of addresses.
   */
  global String previousPageToken;

  /**
   * URL to the previous page of addresses.
   */
  global String previousPageUrl;

  /**
   * Sort order for Commerce addresses. CreatedDateAsc —Sort in ascending order of created date. CreatedDateDesc —Sort in descending order of created date. NameAsc —Sort in ascending order of name. NameDesc —Sort in descending order of name.
   */
  global ConnectApi.CommerceAddressSort sortOrder;

}