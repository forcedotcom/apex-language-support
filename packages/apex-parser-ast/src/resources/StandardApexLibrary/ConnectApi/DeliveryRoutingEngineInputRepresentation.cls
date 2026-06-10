/**
 * Input for the Delivery Routing Engine, which retrieves routing rules to determine which fulfillment locations should fulfill products for a given delivery address.
 */
global class DeliveryRoutingEngineInputRepresentation {

  global DeliveryRoutingEngineInputRepresentation() {}

  /**
   * The destination address for delivery. Use a valid address format. Coordinates: latitude and longitude Postal: country code and postal code Geographic: country code, state, and city
   */
  global ConnectApi.DeliveryAddressInputRepresentation deliveryAddress;

  /**
   * Locations that are excluded from routing consideration. Don't leave any identifier blank. The list can contain up to 100 items.
   */
  global ConnectApi.LocationListInputRepresentation excludeLocations;

  /**
   * The name of the fulfillment criteria group used for routing.
   */
  global String fulfillmentCriteriaGroupName;

  /**
   * The name of the location group where routing is happening.
   */
  global String locationGroupName;

  /**
   * The list of products to route. Enter a value between 1 to 2,000 items.
   */
  global List < ConnectApi.RoutingProductInputRepresentation > products;

  global Object clone() {}

}