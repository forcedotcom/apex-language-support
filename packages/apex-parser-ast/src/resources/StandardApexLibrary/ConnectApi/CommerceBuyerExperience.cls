/**
 * Create, delete, or get commerce addresses. Get order delivery group, order item, order shipments, shipment items, and order summaries. Get adjustments for order items and order summaries.
 */
global class CommerceBuyerExperience {

  public static ConnectApi.OrderToCartResult addOrderToCart(String webstoreId, String orderSummaryId, ConnectApi.OrderToCartInput orderToCartInput) {}

  public static ConnectApi.OrderToCartResult addOrderToCart(String webstoreId, String orderSummaryId, ConnectApi.OrderToCartInput orderToCartInput, String effectiveAccountId) {}

  public static ConnectApi.OrderSummaryAdjustmentAggregatesAsyncOutput calculateAdjustmentAggregates(String webstoreId, ConnectApi.OrderSummaryAdjustmentAggregatesAsyncInput orderSummaryIds) {}

  public static ConnectApi.CommerceAddressCollection getCommerceAccountAddress(String webstoreId, String accountId, Boolean defaultOnly, List<String> addressType, List<String> fields, String pageToken, Integer pageSize, ConnectApi.CommerceAddressSort sortOrder) {}

  public static ConnectApi.CommerceAddressCollection getCommerceAccountAddress(String webstoreId, String accountId, List<String> addressType, Boolean excludeUnsupportedCountries) {}

  public static ConnectApi.CommerceAddressCollection getCommerceAccountAddress(String webstoreId, String accountId, Boolean defaultOnly, List<String> addressType, Boolean excludeUnsupportedCountries) {}

  public static ConnectApi.CommerceAddressCollection getCommerceAccountAddress(String webstoreId, String accountId, Boolean defaultOnly, List<String> addressType, Boolean excludeUnsupportedCountries, List<String> fields, String pageToken, Integer pageSize, ConnectApi.CommerceAddressSort sortOrder) {}

  public static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId) {}

  public static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, Integer pageSize) {}

  public static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String pageParam) {}

  public static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, List<String> fields) {}

  public static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String pageParam, List<String> fields) {}

  public static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, List<String> fields, Integer pageSize) {}

  public static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, List<String> fields, ConnectApi.OrderDeliveryGroupSummarySort sortParam) {}

  public static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, List<String> fields, Integer pageSize, ConnectApi.OrderDeliveryGroupSummarySort sortParam) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, Integer pageSize) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, Integer pageSize) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, String pageParam) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, Integer pageSize) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, String pageParam) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, ConnectApi.OrderItemSummarySort sortParam) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, Integer pageSize, ConnectApi.OrderItemSummarySort sortParam) {}

  public static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, String pageParam, Integer pageSize, ConnectApi.OrderItemSummarySort sortParam, Boolean includeAdjustmentDetails) {}

  public static ConnectApi.OrderItemSummaryAdjustmentCollection getOrderItemSummaryAdjustments(String webstoreId, String orderSummaryId, ConnectApi.OrderItemSummaryAdjustmentCollectionInput orderItemSummaryAdjustmentCollectionInput) {}

  public static ConnectApi.OrderItemSummaryAdjustmentCollection getOrderItemSummaryAdjustments(String webstoreId, String orderSummaryId, ConnectApi.OrderItemSummaryAdjustmentCollectionInput orderItemSummaryAdjustmentCollectionInput, String effectiveAccountId) {}

  public static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId) {}

  public static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId, String effectiveAccountId) {}

  public static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId, String effectiveAccountId, List<String> fields) {}

  public static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId, String effectiveAccountId, List<String> fields, String pageToken, Integer pageSize) {}

  public static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId, String effectiveAccountId, List<String> fields, String pageToken, Integer pageSize, ConnectApi.OrderShipmentItemSort sortOrder) {}

  public static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId) {}

  public static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId, String effectiveAccountId) {}

  public static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId, String effectiveAccountId, List<String> fields) {}

  public static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken) {}

  public static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderShipmentSort sortOrder) {}

  public static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId) {}

  public static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId) {}

  public static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields) {}

  public static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken) {}

  public static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderSummarySortOrder sortOrder) {}

  public static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderSummarySortOrder sortOrder, String earliestDate, String latestDate) {}

  public static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderSummarySortOrder sortOrder, String earliestDate, String latestDate, Boolean ownerScoped) {}

  public static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderSummarySortOrder sortOrder, String earliestDate, String latestDate, Boolean ownerScoped, Boolean includeAdjustmentDetails) {}

  public static ConnectApi.OrderSummaryAdjustmentCollection getOrderSummaryAdjustments(String webstoreId, String orderSummaryId) {}

  public static ConnectApi.OrderSummaryAdjustmentCollection getOrderSummaryAdjustments(String webstoreId, String orderSummaryId, String effectiveAccountId) {}

  public static ConnectApi.OrderSummaryLookupOutput lookupOrderSummary(String webstoreId, String effectiveAccountId, List<String> fields, Boolean excludeLineItems, Boolean excludeDeliveryGroups, Boolean excludeAdjustmentAggregates, Boolean excludeAdjustments, String deliveryGroupId, ConnectApi.OrderSummaryLookupInput orderSummaryLookupInput) {}

  public static ConnectApi.OrderSummaryLookupOutput lookupOrderSummary(String webstoreId, String effectiveAccountId, List<String> fields, ConnectApi.OrderSummaryLookupInput orderSummaryLookupInput) {}

  public static ConnectApi.OrderSummaryLookupOutput lookupOrderSummary(String webstoreId, String effectiveAccountId, ConnectApi.OrderSummaryLookupInput orderSummaryLookupInput) {}

}