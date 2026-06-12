/**
 * A collection of Commerce addresses.
 */
global class CommerceAddressCollection {

  global CommerceAddressCollection() {}

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

  global Object clone() {}

  global Integer getCount() {}

  global String getCurrentPageToken() {}

  global String getCurrentPageUrl() {}

  global List<ConnectApi.CommerceAddressOutput> getItems() {}

  global String getNextPageToken() {}

  global String getNextPageUrl() {}

  global Integer getPageSize() {}

  global String getPreviousPageToken() {}

  global String getPreviousPageUrl() {}

  global ConnectApi.CommerceAddressSort getSortOrder() {}

  global void setCount(Integer value) {}

  global void setCurrentPageToken(String value) {}

  global void setCurrentPageUrl(String value) {}

  global void setItems(List<ConnectApi.CommerceAddressOutput> value) {}

  global void setNextPageToken(String value) {}

  global void setNextPageUrl(String value) {}

  global void setPageSize(Integer value) {}

  global void setPreviousPageToken(String value) {}

  global void setPreviousPageUrl(String value) {}

  global void setSortOrder(ConnectApi.CommerceAddressSort value) {}

}