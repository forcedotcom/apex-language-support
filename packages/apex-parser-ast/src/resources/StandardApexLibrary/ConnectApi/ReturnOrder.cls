/**
 * Process ReturnOrders in Order Management, limited to 2,000 requests per hour.
 */
global class ReturnOrder {

  public static ConnectApi.ReturnOrderOutputRepresentation createReturnOrder(ConnectApi.ReturnOrderInputRepresentation returnOrderInput) {}

  public static ConnectApi.ReturnItemsOutputRepresentation returnItems(String returnOrderId, ConnectApi.ReturnItemsInputRepresentation returnItemsInput) {}

}