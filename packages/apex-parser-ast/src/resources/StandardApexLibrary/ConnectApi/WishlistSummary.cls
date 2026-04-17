/**
 * Summary of a wishlist.
 */
global class WishlistSummary {

  /**
   * Created date for the wishlist in ISO 8601 format, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime createdDate;

  /**
   * ID of the wishlist.
   */
  global String id;

  /**
   * Last modified date of the wishlist in ISO 8601 format, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime modifiedDate;

  /**
   * Name of the wishlist.
   */
  global String name;

  /**
   * Unique product count in the wishlist.
   */
  global Integer wishlistProductCount;

}