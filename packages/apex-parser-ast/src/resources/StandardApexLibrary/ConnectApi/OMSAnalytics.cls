/**
 * Get products with return rates, get text classified into different classifications using text analysis, and capture the return reasons from external sources based on the product ids.
 */
global class OMSAnalytics {

  global OMSAnalytics() {}

  global static ConnectApi.TextClassificationsBulkResultsOutputRepresentation getTextClassificationsBulkResults(List<String> ids) {}

  global static ConnectApi.ProductsListOutputRepresentation productsExpand(String scope, List<String> products, List<ConnectApi.ProductExpandType> expand) {}

  global static ConnectApi.ProductReturnRateListOutputRepresentation productsReturnRate(Integer pageParam, Integer pageSize) {}

  global static ConnectApi.ProductReturnRateListOutputRepresentation productsReturnRate(Integer pageParam, Integer pageSize, List<String> products) {}

  global static ConnectApi.TextClassificationsOutputRepresentation submitTextClassificationsRequest(ConnectApi.TextClassificationsInputRepresentation textClassificationsRequestInput, String llmType) {}

  global Object clone() {}

}