/**
 * Collection of product overviews.
 */
global class ProductOverviewCollection {

  global ProductOverviewCollection() {}

  /**
   * Collection of product overview.
   */
  global List < ConnectApi.ProductOverview > products;

  /**
   * Total number of products returned.
   */
  global Integer total;

  global Object clone() {}

  global List<ConnectApi.ProductOverview> getProducts() {}

  global Integer getTotal() {}

  global void setProducts(List<ConnectApi.ProductOverview> value) {}

  global void setTotal(Integer value) {}

}