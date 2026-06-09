/**
 * Get, create, update, and delete wishlists. Add wishlists to carts. Get wishlist items, add items to wishlists, and delete wishlist items.
 */
global class CommerceWishlist {

  global CommerceWishlist() {}

  global static ConnectApi.WishlistItem addItemToWishlist(String webstoreId, String wishlistId, ConnectApi.WishlistItemInput wishlistItemInput) {}

  global static ConnectApi.WishlistItem addItemToWishlist(String webstoreId, String effectiveAccountId, String wishlistId, ConnectApi.WishlistItemInput wishlistItemInput) {}

  global static ConnectApi.WishlistToCartResult addWishlistToCart(String webstoreId, String wishlistId) {}

  global static ConnectApi.WishlistToCartResult addWishlistToCart(String webstoreId, String wishlistId, String effectiveAccountId) {}

  global static ConnectApi.WishlistToCartResult addWishlistToCartWithCartId(String webstoreId, String wishlistId, String cartId) {}

  global static ConnectApi.WishlistToCartResult addWishlistToCartWithCartId(String webstoreId, String wishlistId, String cartId, String effectiveAccountId) {}

  global static ConnectApi.Wishlist createWishlist(String webstoreId, ConnectApi.WishlistInput wishlistInput) {}

  global static ConnectApi.Wishlist createWishlist(String webstoreId, String effectiveAccountId, ConnectApi.WishlistInput wishlistInput) {}

  global static void deleteWishlist(String webstoreId, String wishlistId) {}

  global static void deleteWishlist(String webstoreId, String effectiveAccountId, String wishlistId) {}

  global static ConnectApi.Wishlist getWishlist(String webstoreId, String effectiveAccountId, String wishlistId, String productFields, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  global static ConnectApi.Wishlist getWishlist(String webstoreId, String effectiveAccountId, String wishlistId, String productFields, Integer pageSize, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  global static ConnectApi.WishlistItemCollection getWishlistItems(String webstoreId, String effectiveAccountId, String wishlistId, String productFields, String pageParam, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  global static ConnectApi.WishlistItemCollection getWishlistItems(String webstoreId, String effectiveAccountId, String wishlistId, String productFields, String pageParam, Integer pageSize, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  global static ConnectApi.WishlistsSummary getWishlistSummaries(String webstoreId, String effectiveAccountId, Boolean includeDisplayedList) {}

  global static ConnectApi.WishlistsSummary getWishlistSummaries(String webstoreId, String effectiveAccountId, Boolean includeDisplayedList, String productFields, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  global static ConnectApi.WishlistsSummary getWishlistSummaries(String webstoreId, String effectiveAccountId, Boolean includeDisplayedList, Integer pageSize, String productFields, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  global static void removeWishlistItem(String webstoreId, String effectiveAccountId, String wishlistId, String wishlistItemId) {}

  global static ConnectApi.WishlistSummary updateWishlist(String webstoreId, String wishlistId, ConnectApi.WishlistUpdateInput wishlistUpdateInput) {}

  global static ConnectApi.WishlistSummary updateWishlist(String webstoreId, String effectiveAccountId, String wishlistId, ConnectApi.WishlistUpdateInput wishlistUpdateInput) {}

  global Object clone() {}

}