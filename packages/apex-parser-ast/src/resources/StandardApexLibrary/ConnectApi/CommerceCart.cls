/**
 * Get, create, update, calculate, and delete carts. Get cart items, add items to carts, update and delete cart items.
 */
global class CommerceCart {

  global CommerceCart() {}

  global static ConnectApi.CartItem addItemToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemInput cartItemInput, String currencyIsoCode) {}

  global static ConnectApi.CartItem addItemToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemInput cartItemInput, String currencyIsoCode, Boolean includeCartData) {}

  global static ConnectApi.BatchResult[] addItemsToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, List<ConnectApi.BatchInput> cartItems) {}

  global static ConnectApi.BatchResult[] addItemsToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, List<ConnectApi.BatchInput> cartItems, String currencyIsoCode) {}

  global static ConnectApi.CartItem addItemToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemInput cartItemInput) {}

  global static ConnectApi.CartCouponCollection applyCartCoupon(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.cartCouponInput cartCouponInput, String currencyIsoCode) {}

  global static ConnectApi.CartToWishlistResult copyCartToWishlist(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartToWishlistInput cartToWishlistInput) {}

  global static ConnectApi.CalculateCartResult calculateCart(String webstoreId, String activeCartOrId, String effectiveAccountId) {}

  global static ConnectApi.CalculateCartResult calculateCart(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CalculateCartInput calculateCartInput) {}

  global static ConnectApi.CartSummary createCart(String webstoreId, ConnectApi.CartInput cart) {}

  global static ConnectApi.CartFromQuoteOutput createCartFromQuote(String webstoreId, String quoteId, ConnectApi.CartFromQuoteInput cartFromQuoteInput) {}

  global static ConnectApi.CreateQuoteFromCartOutput createQuoteFromCart(String webstoreId, String activeCartOrId, ConnectApi.CreateQuoteFromCartInput createQuoteFromCartInput) {}

  global static ConnectApi.CartSummary cloneCart(String webstoreId, String activeCartOrId, String targetEffectiveAccountId, String targetType) {}

  global static void deleteCart(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  global static void deleteCartCoupon(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartCouponId, String currencyIsoCode) {}

  global static void deleteCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartItemId) {}

  global static void deleteInventoryReservation(String webstoreId, String activeCartOrId, String effectiveAccountId) {}

  global static ConnectApi.CalculateCartResult evaluateShipping(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CartEvaluateShippingInput cartEvaluateShippingInput) {}

  global static ConnectApi.CalculateCartResult evaluateTaxes(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CartEvaluateTaxInput cartEvaluateTaxInput) {}

  global static ConnectApi.CartCouponCollection getCartCoupons(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  global static ConnectApi.CartItemPromotionCollectionOutputRepresentation getCartItemPromotion(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemPromotionCollectionInputRepresentation cartItemPromotionCollectionInput) {}

  global static ConnectApi.CartItemPromotionCollectionOutputRepresentation getCartItemPromotion(String webstoreId, String effectiveAccountId, String activeCartOrId, ConnectApi.CartItemPromotionCollectionInputRepresentation cartItemPromotionCollectionInput, String currencyIsoCode) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String pageParam) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String pageParam, ConnectApi.CartItemSortOrder sortParam) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String pageParam, Integer pageSize) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String productFields, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String productFields, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam, String currencyIsoCode) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String productFields, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam, String currencyIsoCode, Boolean includePromotions, Boolean includeCoupons) {}

  global static ConnectApi.CartItemCollection getCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, String productFields, String pageParam, Integer pageSize, ConnectApi.CartItemSortOrder sortParam, String currencyIsoCode, Boolean includePromotions, Boolean includeCoupons, Integer pageNumber) {}

  global static ConnectApi.CartPromotionCollection getCartPromotions(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  global static ConnectApi.CartPromotionCollection getCartPromotions(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  global static ConnectApi.CartSummary getCartSummary(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  global static ConnectApi.CartSummary getCartSummary(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  global static ConnectApi.CartSummary getOrCreateActiveCartSummary(String webstoreId, String effectiveAccountId, String activeCartOrId) {}

  global static ConnectApi.CartSummary getOrCreateActiveCartSummary(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  global static ConnectApi.ProductCartItem getProductCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String productId, String currencyIsoCode) {}

  global static ConnectApi.ProductCartItemCollection getProductCartItems(String webstoreId, String effectiveAccountId, String activeCartOrId, Integer pageSize, Integer pageNumber, String currencyIsoCode) {}

  global static ConnectApi.CommerceActionResult makeCartPrimary(String webstoreId, String activeCartOrId, String effectiveAccountId) {}

  global static ConnectApi.PreserveCart preserveGuestCart(String webstoreId, String effectiveAccountId, String activeCartOrId, String currencyIsoCode) {}

  global static ConnectApi.CartMessagesVisibilityResult setCartMessagesVisibility(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CartMessagesVisibilityInput messageVisibility) {}

  global static ConnectApi.CartItem updateCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartItemId, ConnectApi.CartItemInput cartItem) {}

  global static ConnectApi.CartItem updateCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartItemId, ConnectApi.CartItemInput cartItem, String currencyIsoCode) {}

  global static ConnectApi.CartItem updateCartItem(String webstoreId, String effectiveAccountId, String activeCartOrId, String cartItemId, ConnectApi.CartItemInput cartItem, String currencyIsoCode, Boolean includeCartData) {}

  global static ConnectApi.CartInventoryReservationOutputRepresentation upsertInventoryReservation(String webstoreId, String activeCartOrId, String effectiveAccountId, ConnectApi.CartInventoryReservationInputRepresentation cartInventoryReservationInput) {}

  global Object clone() {}

}