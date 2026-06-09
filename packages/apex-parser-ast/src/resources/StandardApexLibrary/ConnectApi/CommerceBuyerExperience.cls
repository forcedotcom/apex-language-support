/**
 * Create, delete, or get commerce addresses. Get order delivery group, order item, order shipments, shipment items, and order summaries. Get adjustments for order items and order summaries.
 */
global class CommerceBuyerExperience {

  global CommerceBuyerExperience() {}

  global static ConnectApi.OrderToCartResult addOrderToCart(String webstoreId, String orderSummaryId, ConnectApi.OrderToCartInput orderToCartInput) {}

  global static ConnectApi.OrderToCartResult addOrderToCart(String webstoreId, String orderSummaryId, ConnectApi.OrderToCartInput orderToCartInput, String effectiveAccountId) {}

  global static ConnectApi.OrderSummaryAdjustmentAggregatesAsyncOutput calculateAdjustmentAggregates(String webstoreId, ConnectApi.OrderSummaryAdjustmentAggregatesAsyncInput orderSummaryIds) {}

  global static ConnectApi.CommerceAddressCollection getCommerceAccountAddress(String webstoreId, String accountId, Boolean defaultOnly, List<String> addressType, List<String> fields, String pageToken, Integer pageSize, ConnectApi.CommerceAddressSort sortOrder) {}

  global static ConnectApi.CommerceAddressCollection getCommerceAccountAddress(String webstoreId, String accountId, List<String> addressType, Boolean excludeUnsupportedCountries) {}

  global static ConnectApi.CommerceAddressCollection getCommerceAccountAddress(String webstoreId, String accountId, Boolean defaultOnly, List<String> addressType, Boolean excludeUnsupportedCountries) {}

  global static ConnectApi.CommerceAddressCollection getCommerceAccountAddress(String webstoreId, String accountId, Boolean defaultOnly, List<String> addressType, Boolean excludeUnsupportedCountries, List<String> fields, String pageToken, Integer pageSize, ConnectApi.CommerceAddressSort sortOrder) {}

  global static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId) {}

  global static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, Integer pageSize) {}

  global static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String pageParam) {}

  global static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, List<String> fields) {}

  global static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String pageParam, List<String> fields) {}

  global static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, List<String> fields, Integer pageSize) {}

  global static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, List<String> fields, ConnectApi.OrderDeliveryGroupSummarySort sortParam) {}

  global static ConnectApi.OrderDeliveryGroupSummaryCollection getOrderDeliveryGroupSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, List<String> fields, Integer pageSize, ConnectApi.OrderDeliveryGroupSummarySort sortParam) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, Integer pageSize) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, Integer pageSize) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, String pageParam) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, Integer pageSize) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, String pageParam) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, ConnectApi.OrderItemSummarySort sortParam) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, Integer pageSize, ConnectApi.OrderItemSummarySort sortParam) {}

  global static ConnectApi.OrderItemSummaryCollection getOrderItemSummaries(String webstoreId, String effectiveAccountId, String orderSummaryId, String orderDeliveryGroupSummaryId, List<String> fields, String pageParam, Integer pageSize, ConnectApi.OrderItemSummarySort sortParam, Boolean includeAdjustmentDetails) {}

  global static ConnectApi.OrderItemSummaryAdjustmentCollection getOrderItemSummaryAdjustments(String webstoreId, String orderSummaryId, ConnectApi.OrderItemSummaryAdjustmentCollectionInput orderItemSummaryAdjustmentCollectionInput) {}

  global static ConnectApi.OrderItemSummaryAdjustmentCollection getOrderItemSummaryAdjustments(String webstoreId, String orderSummaryId, ConnectApi.OrderItemSummaryAdjustmentCollectionInput orderItemSummaryAdjustmentCollectionInput, String effectiveAccountId) {}

  global static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId) {}

  global static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId, String effectiveAccountId) {}

  global static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId, String effectiveAccountId, List<String> fields) {}

  global static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId, String effectiveAccountId, List<String> fields, String pageToken, Integer pageSize) {}

  global static ConnectApi.OrderShipmentItemCollection getOrderShipmentItems(String webstoreId, String shipmentId, String effectiveAccountId, List<String> fields, String pageToken, Integer pageSize, ConnectApi.OrderShipmentItemSort sortOrder) {}

  global static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId) {}

  global static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId, String effectiveAccountId) {}

  global static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId, String effectiveAccountId, List<String> fields) {}

  global static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken) {}

  global static ConnectApi.OrderShipmentCollection getOrderShipments(String webstoreId, String orderSummaryId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderShipmentSort sortOrder) {}

  global static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId) {}

  global static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId) {}

  global static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields) {}

  global static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken) {}

  global static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderSummarySortOrder sortOrder) {}

  global static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderSummarySortOrder sortOrder, String earliestDate, String latestDate) {}

  global static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderSummarySortOrder sortOrder, String earliestDate, String latestDate, Boolean ownerScoped) {}

  global static ConnectApi.OrderSummaryCollectionRepresentation getOrderSummaries(String webstoreId, String effectiveAccountId, List<String> fields, Integer pageSize, String pageToken, ConnectApi.OrderSummarySortOrder sortOrder, String earliestDate, String latestDate, Boolean ownerScoped, Boolean includeAdjustmentDetails) {}

  global static ConnectApi.OrderSummaryAdjustmentCollection getOrderSummaryAdjustments(String webstoreId, String orderSummaryId) {}

  global static ConnectApi.OrderSummaryAdjustmentCollection getOrderSummaryAdjustments(String webstoreId, String orderSummaryId, String effectiveAccountId) {}

  global static ConnectApi.OrderSummaryLookupOutput lookupOrderSummary(String webstoreId, String effectiveAccountId, List<String> fields, Boolean excludeLineItems, Boolean excludeDeliveryGroups, Boolean excludeAdjustmentAggregates, Boolean excludeAdjustments, String deliveryGroupId, ConnectApi.OrderSummaryLookupInput orderSummaryLookupInput) {}

  global static ConnectApi.OrderSummaryLookupOutput lookupOrderSummary(String webstoreId, String effectiveAccountId, List<String> fields, ConnectApi.OrderSummaryLookupInput orderSummaryLookupInput) {}

  global static ConnectApi.OrderSummaryLookupOutput lookupOrderSummary(String webstoreId, String effectiveAccountId, ConnectApi.OrderSummaryLookupInput orderSummaryLookupInput) {}

  global Object clone() {}

}