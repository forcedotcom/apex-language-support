/**
 * A cart summary.
 */
global class CartSummary {

  /**
   * ID of the account for the cart.
   */
  global String accountId;

  /**
   * Asynchronous processing status of the cart, if asynchronous processing is enabled for the store. This property returns Completed in Apex, because Apex operations always run synchronously.
   */
  global String asyncOperationStatus;

  /**
   * ID of the cart.
   */
  global String cartId;

  /**
   * Three-letter ISO 4217 currency code associated with the cart.
   */
  global String currencyIsoCode;

  /**
   * Array of sObjects and viewable custom fields for the sObjects. Field-level security rules from the shopper profile are applied to the custom fields. The rules are applied for registered shoppers and for the guest shopper profile. If no custom fields were specified, returns an empty collection.
   */
  global List < SObject > customFields;

  /**
   * First payment amount for subscription products, plus the total payment amount for non-subscription products. Includes taxes.
   */
  global String firstPymtGrandTotalAmount;

  /**
   * The total amount on the first payment of the cart.
   */
  global String firstPymtTotalAmount;

  /**
   * The total list price on the first payment of the cart.
   */
  global String firstPymtTotalListPrice;

  /**
   * Tax amount on the first payment for any subscription products, plus the total tax amount on non-subscription products.
   */
  global String firstPymtTotalTaxAmount;

  /**
   * Grand total amount including shipping and tax for items in the cart, in the currency of the cart.
   */
  global String grandTotalAmount;

  /**
   * Specifies whether the cart contains a gift ( true ) or not ( false ).
   */
  global Boolean hasGift;

  /**
   * Specifies whether the cart is secondary ( true ) or not ( false ).
   */
  global Boolean isSecondary;

  /**
   * Name of the cart.
   */
  global String name;

  /**
   * ID of the owner of the cart.
   */
  global String ownerId;

  /**
   * ID of the owner of the order.
   */
  global String ownerOrderId;

  /**
   * Purchase order for the cart.
   */
  global String purchaseOrderNumber;

  /**
   * Status of the cart. Values are: Active— Cart is created and available for modifications, like adding or removing products or promotions. Checkout— Cart is in checkout. If the customer modifies the cart, the current checkout session is canceled. Closed— Checkout is complete and an order was created. The cart cannot be modified. PendingClosed— Cart is marked to be closed, but the request isn't completed yet. The cart can’t be modified. This value is available in API version 57.0 and later. PendingDelete— Cart is marked for delete, but the request isn't completed yet. The cart can’t be modified. Processing— Cart is processing. For example, taxes are being calculated. The cart can’t be modified.
   */
  global ConnectApi.CartStatus status;

  /**
   * Tax type of the cart. Automatic —Automatic taxation policy. Gross —Gross taxation policy. Net —Net taxation policy.
   */
  global String taxType;

  /**
   * Total amount, including both tier and item level discounts but excluding cart level discounts, for all items in the cart.
   */
  global String totalAmountWithItemAdjustment;

  /**
   * Total cart level discount amount for the cart.
   */
  global String totalCartLevelAdjustmentAmount;

  /**
   * Total amount for shipping and other charges in the currency of the cart. Includes adjustments from shipping promotions.
   */
  global String totalChargeAmount;

  /**
   * Total list price for all cart items plus shipping adjustments.
   */
  global String totalListPrice;

  /**
   * Total amount including discounts, but excluding shipping and tax, for product items in the cart.
   */
  global String totalProductAmount;

  /**
   * Total product amount, including promotions.
   */
  global String totalProductAmountAfterAdjustments;

  /**
   * Total count of items in the cart. This field may not be accurate when faster add-to-cart is turned on and quantity rules are enabled for products in the cart.
   */
  global String totalProductCount;

  /**
   * Total count of line items, of the type Product, in the cart.
   */
  global Integer totalProductLineItemCount;

  /**
   * Total list price for all products in the cart without any adjustments.
   */
  global String totalProductListAmount;

  /**
   * Total promotional adjustment amount for items in the cart.
   */
  global String totalPromotionalAdjustmentAmount;

  /**
   * Total quantity of all cart items with the selling model type Evergreen or Term-Defined.
   */
  global String totalSubProductCount;

  /**
   * Total tax amount for the cart, including tax on shipping, if applicable.
   */
  global String totalTaxAmount;

  /**
   * Type of cart. Values are: Cart —Cart created by a customer. PayNowReadOnly —Clone of a Template cart that the customer can check out with using the Pay Now feature. Template —Cart created by an internal user.
   */
  global ConnectApi.CartType type;

  /**
   * Total count of unique items, or SKUs, in the cart. This field is supported when faster add-to-cart is turned off.
   */
  global Integer uniqueProductCount;

  /**
   * ID of the webstore of the cart.
   */
  global String webstoreId;

}