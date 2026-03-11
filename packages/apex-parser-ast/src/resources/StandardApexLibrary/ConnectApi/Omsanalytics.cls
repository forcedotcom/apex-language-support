/**
 * Get products with return rates, get text classified into different classifications using text analysis, and capture the return reasons from external sources based on the product ids.
 */
global class OMSAnalytics {

  public static ConnectApi.TextClassificationsBulkResultsOutputRepresentation getTextClassificationsBulkResults(List<String> ids) {}

  public static ConnectApi.ProductsListOutputRepresentation productsExpand(String scope, List<String> products, List<ConnectApi.ProductExpandType> expand) {}

  public static ConnectApi.ProductReturnRateListOutputRepresentation productsReturnRate(Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ProductReturnRateListOutputRepresentation productsReturnRate(Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ProductReturnRateListOutputRepresentation productsReturnRate(Integer pageParam, Integer pageSize, List<String> products) {}

  public static ConnectApi.TextClassificationsOutputRepresentation submitTextClassificationsRequest(ConnectApi.TextClassificationsInputRepresentation textClassificationsRequestInput, String llmType) {}

}