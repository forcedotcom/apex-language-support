/**
 * Process ReturnOrders in Order Management, limited to 2,000 requests per hour.
 */
global class ReturnOrder {

  global ReturnOrder() {}

  global static ConnectApi.ReturnOrderOutputRepresentation createReturnOrder(ConnectApi.ReturnOrderInputRepresentation returnOrderInput) {}

  global static ConnectApi.ReturnItemsOutputRepresentation returnItems(String returnOrderId, ConnectApi.ReturnItemsInputRepresentation returnItemsInput) {}

  global Object clone() {}

}