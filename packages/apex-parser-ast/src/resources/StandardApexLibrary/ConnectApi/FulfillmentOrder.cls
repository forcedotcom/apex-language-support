/**
 * Fulfill orders in Order Management.
 */
global class FulfillmentOrder {

  global FulfillmentOrder() {}

  global static ConnectApi.FulfillmentOrderCancelLineItemsOutputRepresentation cancelFulfillmentOrderLineItems(String fulfillmentOrderId, ConnectApi.FulfillmentOrderLineItemsToCancelInputRepresentation cancelFulfillmentOrderLineItemsInput) {}

  global static ConnectApi.FulfillmentOrderOutputRepresentation createFulfillmentOrders(ConnectApi.FulfillmentOrderInputRepresentation fulfillmentOrderInput) {}

  global static ConnectApi.FulfillmentOrderInvoiceOutputRepresentation createInvoice(String fulfillmentOrderId, ConnectApi.FulfillmentOrderInvoiceInputRepresentation invoiceInput) {}

  global static ConnectApi.MultipleFulfillmentOrderOutputRepresentation createMultipleFulfillmentOrder(ConnectApi.MultipleFulfillmentOrderInputRepresentation multipleFulfillmentOrderInput) {}

  global static ConnectApi.MultipleFulfillmentOrderInvoicesOutputRepresentation createMultipleInvoices(ConnectApi.MultipleFulfillmentOrderInvoicesInputRepresentation invoicesInput) {}

  global Object clone() {}

}