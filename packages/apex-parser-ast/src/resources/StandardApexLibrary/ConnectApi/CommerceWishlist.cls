/**
 * Get, create, update, and delete wishlists. Add wishlists to carts. Get wishlist items, add items to wishlists, and delete wishlist items.
 */
global class CommerceWishlist {

  public static ConnectApi.WishlistItem addItemToWishlist(String webstoreId, String wishlistId, ConnectApi.WishlistItemInput wishlistItemInput) {}

  public static ConnectApi.WishlistItem addItemToWishlist(String webstoreId, String effectiveAccountId, String wishlistId, ConnectApi.WishlistItemInput wishlistItemInput) {}

  public static ConnectApi.WishlistToCartResult addWishlistToCart(String webstoreId, String wishlistId) {}

  public static ConnectApi.WishlistToCartResult addWishlistToCart(String webstoreId, String wishlistId, String effectiveAccountId) {}

  public static ConnectApi.WishlistToCartResult addWishlistToCartWithCartId(String webstoreId, String wishlistId, String cartId) {}

  public static ConnectApi.WishlistToCartResult addWishlistToCartWithCartId(String webstoreId, String wishlistId, String cartId, String effectiveAccountId) {}

  public static ConnectApi.Wishlist createWishlist(String webstoreId, ConnectApi.WishlistInput wishlistInput) {}

  public static ConnectApi.Wishlist createWishlist(String webstoreId, String effectiveAccountId, ConnectApi.WishlistInput wishlistInput) {}

  public static void deleteWishlist(String webstoreId, String wishlistId) {}

  public static void deleteWishlist(String webstoreId, String effectiveAccountId, String wishlistId) {}

  public static ConnectApi.Wishlist getWishlist(String webstoreId, String effectiveAccountId, String wishlistId, String productFields, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  public static ConnectApi.Wishlist getWishlist(String webstoreId, String effectiveAccountId, String wishlistId, String productFields, Integer pageSize, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  public static ConnectApi.WishlistItemCollection getWishlistItems(String webstoreId, String effectiveAccountId, String wishlistId, String productFields, String pageParam, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  public static ConnectApi.WishlistItemCollection getWishlistItems(String webstoreId, String effectiveAccountId, String wishlistId, String productFields, String pageParam, Integer pageSize, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  public static ConnectApi.WishlistsSummary getWishlistSummaries(String webstoreId, String effectiveAccountId, Boolean includeDisplayedList) {}

  public static ConnectApi.WishlistsSummary getWishlistSummaries(String webstoreId, String effectiveAccountId, Boolean includeDisplayedList, String productFields, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  public static ConnectApi.WishlistsSummary getWishlistSummaries(String webstoreId, String effectiveAccountId, Boolean includeDisplayedList, Integer pageSize, String productFields, ConnectApi.WishlistItemSortOrder sortItemsBy) {}

  public static void removeWishlistItem(String webstoreId, String effectiveAccountId, String wishlistId, String wishlistItemId) {}

  public static ConnectApi.WishlistSummary updateWishlist(String webstoreId, String wishlistId, ConnectApi.WishlistUpdateInput wishlistUpdateInput) {}

  public static ConnectApi.WishlistSummary updateWishlist(String webstoreId, String effectiveAccountId, String wishlistId, ConnectApi.WishlistUpdateInput wishlistUpdateInput) {}

}