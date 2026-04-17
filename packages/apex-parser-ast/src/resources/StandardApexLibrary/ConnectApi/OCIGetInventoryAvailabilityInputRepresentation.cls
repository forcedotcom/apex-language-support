/**
 * Details of a request to retrieve inventory availability.
 */
global class OCIGetInventoryAvailabilityInputRepresentation {

  /**
   * Specifies whether the returned inventory level includes variant products if the given product has variants. When set to true , only one product ID is accepted. There's a limit of 100 variant products. If the total of variants exceeds 100, no variants are included in the inventory level.
   */
  global Boolean includeRelatedProducts;

  /**
   * The External Reference of a location group to retrieve inventory availability data for. Specifying this value retrieves inventory data for all locations belonging to this group.
   */
  global String locationGroupIdentifier;

  /**
   * A list of up to 100 External References of location groups to retrieve inventory availability data for.
   */
  global List < String > locationGroupIdentifiers;

  /**
   * A list of up to 100 External References of locations to retrieve inventory availability data for.
   */
  global List < String > locationIdentifiers;

  /**
   * The SKU of a product to retrieve inventory availability data for. Specifying a SKU with no locations or location groups returns availability data for that SKU at all inventory locations that aren’t assigned to location groups.
   */
  global String stockKeepingUnit;

  /**
   * A list of up to 100 SKUs of products to retrieve inventory availability data for.
   */
  global List < String > stockKeepingUnits;

  /**
   * Specifies whether to fetch the inventory data from the cache. The default value is true .
   */
  global Boolean useCache;

}