/**
 * Page of product summaries.
 */
global class ProductSummaryPage {

  global ProductSummaryPage() {}

  /**
   * Three-letter ISO 4217 currency code associated with the product.
   */
  global String currencyIsoCode;

  /**
   * Number of products per page in the search results.
   */
  global Integer pageSize;

  /**
   * Collection of product summaries.
   */
  global List < ConnectApi.ProductSummary > products;

  /**
   * Total number of products in the search results.
   */
  global Long total;

  global Object clone() {}

  global String getCurrencyIsoCode() {}

  global Integer getPageSize() {}

  global List<ConnectApi.ProductSummary> getProducts() {}

  global Long getTotal() {}

  global void setCurrencyIsoCode(String value) {}

  global void setPageSize(Integer value) {}

  global void setProducts(List<ConnectApi.ProductSummary> value) {}

  global void setTotal(Long value) {}

}