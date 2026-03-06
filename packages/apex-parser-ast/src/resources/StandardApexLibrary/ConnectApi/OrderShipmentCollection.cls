/**
 * Collection of order shipments.
 */
global class OrderShipmentCollection {

  /**
   * Total number of records returned in the collection.
   */
  global Integer count;

  /**
   * Token identifying the current page of order shipments.
   */
  global String currentPageToken;

  /**
   * URL to the current page of order shipments.
   */
  global String currentPageUrl;

  /**
   * Token identifying the next page of order shipments.
   */
  global String nextPageToken;

  /**
   * URL to the next page of order shipments.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page of order shipments.
   */
  global String previousPageToken;

  /**
   * URL to the previous page of order shipments.
   */
  global String previousPageUrl;

  /**
   * Collection of order shipments.
   */
  global List < ConnectApi.OrderShipment > shipments;

  /**
   * Sort order for order shipments. Values are: ExpectedDeliveryDateAsc —Sorts by the oldest expected delivery date. ExpectedDeliveryDateDesc —Sorts by the most recent expected delivery date. ShipmentNumberAsc —Sorts by shipment number in ascending order (0–9). ShipmentNumberDesc —Sorts by shipment number in descending order (9–0).
   */
  global ConnectApi.OrderShipmentSort sortOrder;

}