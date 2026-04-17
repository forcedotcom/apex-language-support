/**
 * Collection of order shipment items.
 */
global class OrderShipmentItemCollection {

  /**
   * Total number of records returned in a page.
   */
  global Integer count;

  /**
   * Token identifying the current page of order shipment items.
   */
  global String currentPageToken;

  /**
   * URL to the current page of order shipment items.
   */
  global String currentPageUrl;

  /**
   * Collection of order shipment items.
   */
  global List < ConnectApi.OrderShipmentItem > items;

  /**
   * Token identifying the next page of order shipment items.
   */
  global String nextPageToken;

  /**
   * URL to the next page of order shipment items.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page of order shipment items.
   */
  global String previousPageToken;

  /**
   * URL to the previous page of order shipment items.
   */
  global String previousPageUrl;

  /**
   * Sort order for order shipment items. Values are: IdAsc —Sorts by ID in ascending alphanumeric order (A–Z, 0–9). IdDesc —Sorts by ID in descending alphanumeric order (Z–A, 9–0).
   */
  global ConnectApi.OrderShipmentItemSort sortOrder;

}