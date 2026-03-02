/**
 * Get, create, update, calculate, and delete carts. Get cart items, add items to carts, update and delete cart items.
 */
public class CommerceCart {

  public static ConnectApi.CartItem addItemToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemInput cartItemInput, String currencyIsoCode) {}

  public static ConnectApi.CartItem addItemToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemInput cartItemInput, String currencyIsoCode, Boolean includeCartData) {}

  public static ConnectApi.BatchResult[] addItemsToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, List<ConnectApi.BatchInput> cartItems) {}

  public static ConnectApi.BatchResult[] addItemsToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, List<ConnectApi.BatchInput> cartItems, String currencyIsoCode) {}

  public static ConnectApi.CartItem addItemToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemInput cartItemInput) {}

  public static ConnectApi.CartCouponCollection applyCartCoupon(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.cartCouponInput cartCouponInput, String currencyIsoCode) {}

  public static ConnectApi.CartToWishlistResult copyCartToWishlist(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartToWishlistInput cartToWishlistInput) {}

  public static ConnectApi.CalculateCartResult calculateCart(String webstoreId, String activeCartOrId, String effectiveAccountId) {}

  public static ConnectApi.CalculateCartResult calculateCart(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CalculateCartInput calculateCartInput) {}

  public static ConnectApi.CartSummary createCart(String webstoreId, ConnectApi.CartInput cart) {}

  public static ConnectApi.CartSummary cloneCart(String webstoreId, String activeCartOrId, String targetEffectiveAccountId, String targetType) {}

  public static Void deleteCart(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  public static Void deleteCartCoupon(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartCouponId, String currencyIsoCode) {}

  public static Void deleteCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartItemId) {}

  public static Void deleteInventoryReservation(String webstoreId, String activeCartOrId, String effectiveAccountId) {}

  public static ConnectApi.CalculateCartResult evaluateShipping(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CartEvaluateShippingInput cartEvaluateShippingInput) {}

  public static ConnectApi.CalculateCartResult evaluateTaxes(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CartEvaluateTaxInput cartEvaluateTaxInput) {}

  public static ConnectApi.CartCouponCollection getCartCoupons(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  public static ConnectApi.CartItemPromotionCollectionOutputRepresentation getCartItemPromotion(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemPromotionCollectionInputRepresentation cartItemPromotionCollectionInput) {}

  public static ConnectApi.CartItemPromotionCollectionOutputRepresentation getCartItemPromotion(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemPromotionCollectionInputRepresentation cartItemPromotionCollectionInput, String currencyIsoCode) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String pageParam) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String pageParam, ConnectApi.CartItemSortOrder sortParam) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String pageParam, Integer pageSize) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String productFields, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String productFields, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam, String currencyIsoCode) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String productFields, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam, String currencyIsoCode, Boolean includePromotions, Boolean includeCoupons) {}

  public static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String productFields, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam, String currencyIsoCode, Boolean includePromotions, Boolean includeCoupons, Integer pageNumber) {}

  public static ConnectApi.CartPromotionCollection getCartPromotions(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  public static ConnectApi.CartPromotionCollection getCartPromotions(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  public static ConnectApi.CartSummary getCartSummary(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  public static ConnectApi.CartSummary getCartSummary(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  public static ConnectApi.CartSummary getOrCreateActiveCartSummary(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  public static ConnectApi.CartSummary getOrCreateActiveCartSummary(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  public static ConnectApi.ProductCartItem getProductCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String productId, String currencyIsoCode) {}

  public static ConnectApi.ProductCartItemCollection getProductCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, Integer pageSize, Integer pageNumber, String currencyIsoCode) {}

  public static ConnectApi.CommerceActionResult makeCartPrimary(String webstoreId, String activeCartOrId, String effectiveAccountId) {}

  public static ConnectApi.PreserveCart preserveGuestCart(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  public static ConnectApi.CartMessagesVisibilityResult setCartMessagesVisibility(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CartMessagesVisibilityInput messageVisibility) {}

  public static ConnectApi.CartItem updateCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartItemId, ConnectApi.CartItemInput cartItem) {}

  public static ConnectApi.CartItem updateCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartItemId, ConnectApi.CartItemInput cartItem, String currencyIsoCode) {}

  public static ConnectApi.CartItem updateCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartItemId, ConnectApi.CartItemInput cartItem, String currencyIsoCode, Boolean includeCartData) {}

  public static ConnectApi.CartInventoryReservationOutputRepresentation upsertInventoryReservation(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CartInventoryReservationInputRepresentation cartInventoryReservationInput) {}

}