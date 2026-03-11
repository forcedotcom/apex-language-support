/**
 * Shipment item.
 */
global class OrderShipmentItem {

  /**
   * Map of requested fields.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * ID of the order item summary.
   */
  global String orderItemSummaryId;

  /**
   * Product mapped to an order item summary.
   */
  global ConnectApi.OrderItemSummaryProduct product;

  /**
   * ID of the product.
   */
  global String productId;

  /**
   * Quantity of the product.
   */
  global Double quantity;

  /**
   * ID of the shipment.
   */
  global String shipmentId;

  /**
   * ID of the shipment item.
   */
  global String shipmentItemId;

}