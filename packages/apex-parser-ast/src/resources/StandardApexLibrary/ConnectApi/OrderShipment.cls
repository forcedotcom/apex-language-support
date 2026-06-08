/**
 * Order shipment.
 */
global class OrderShipment {

  global OrderShipment() {}

  /**
   * Expected delivery date for the shipment.
   */
  global Datetime expectedDeliveryDate;

  /**
   * Map of requested fields.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * ID of the order summary.
   */
  global String orderSummaryId;

  /**
   * ID of the shipment.
   */
  global String shipmentId;

  /**
   * Number of the shipment.
   */
  global String shipmentNumber;

  /**
   * Status of the shipment.
   */
  global String status;

  global Object clone() {}

}