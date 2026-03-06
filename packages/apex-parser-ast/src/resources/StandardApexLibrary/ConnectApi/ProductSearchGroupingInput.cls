/**
 * Grouping information for product search results.
 */
global class ProductSearchGroupingInput {

  /**
   * Grouping option for search results. Values are: BestMatch —Search results are grouped by the best-match product of the variation group. NoGrouping —Search results aren’t grouped. VariationParent —Search results are grouped by the variation parent.
   */
  global ConnectApi.CommerceSearchGroupingOption groupingOption;

  /**
   * Type of the top product to return for each product group in search results. Value is: VariationParent If NoGrouping is specified for groupingOption , topProductType is ignored.
   */
  global ConnectApi.CommerceSearchTopProductType topProductType;

}