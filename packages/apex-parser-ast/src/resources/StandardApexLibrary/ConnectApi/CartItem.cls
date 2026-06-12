/**
 * An item in a cart.
 */
global class CartItem extends ConnectApi.AbstractCartItem {

  global CartItem() {}

  /**
   * Currency ISO code of the cart.
   */
  global String currencyIsoCode;

  /**
   * Collection of items in the cart.
   */
  global ConnectApi.CartItemCollection cartData;

  /**
   * For subscription items, the first payment amount after adjustments and taxes. For non-subscription products, the value is the same as totalAmount .
   */
  global String firstPymtTotalAmount;

  /**
   * For subscription items, the total list price of the first payment. For non-subscription items, the value is the same as totalListPrice .
   */
  global String firstPymtTotalListPrice;

  /**
   * For subscription items, the first term price, including adjustments but excluding taxes. For non-subscription items, the total price, including adjustments but excluding taxes.
   */
  global String firstPymtTotalPrice;

  /**
   * For subscription items, the tax amount on the first payment. For non-subscription products, the value is the same as totalTax .
   */
  global String firstPymtTotalTax;

  /**
   * Total itemized adjustment amount for the item, including promotions and excluding taxes.
   */
  global String itemizedAdjustmentAmount;

  /**
   * List price for the item.
   */
  global String listPrice;

  /**
   * Class of product. Values are: Bundle Set Simple Variation VariationParent
   */
  global ConnectApi.ProductClass productClass;

  /**
   * Sales price for the item.
   */
  global String salesPrice;

  /**
   * Total adjustment amount for the item.
   */
  global String totalAdjustmentAmount;

  /**
   * Total amount for the item.
   */
  global String totalAmount;

  /**
   * Total list price for the item.
   */
  global String totalListPrice;

  /**
   * Total price for the item including adjustments but excluding taxes.
   */
  global String totalPrice;

  /**
   * Total tax for the item.
   */
  global String totalTax;

  /**
   * Unit price, including tier level discounts, for the item. This value is informational only and isn’t used in pricing calculations.
   */
  global String unitAdjustedPrice;

  /**
   * Unit price, including both tier and item level discounts, for the item. This value is informational only and isn’t used in pricing calculations.
   */
  global String unitAdjustedPriceWithItemAdj;

  /**
   * Tier level adjustments made to the unit price for the item. This value is informational only and isn’t used in pricing calculations.
   */
  global String unitAdjustmentAmount;

  /**
   * Item level adjustments made to the unit price for the item. This value is informational only and isn’t used in pricing calculations.
   */
  global String unitItemAdjustmentAmount;

  global Object clone() {}

  global ConnectApi.CartItemCollection getCartData() {}

  global String getCurrencyIsoCode() {}

  global String getFirstPymtTotalAmount() {}

  global String getFirstPymtTotalListPrice() {}

  global String getFirstPymtTotalPrice() {}

  global String getFirstPymtTotalTax() {}

  global String getItemizedAdjustmentAmount() {}

  global String getListPrice() {}

  global ConnectApi.ProductClass getProductClass() {}

  global String getQuoteLineItemId() {}

  global String getSalesPrice() {}

  global String getTotalAdjustmentAmount() {}

  global String getTotalAmount() {}

  global String getTotalListPrice() {}

  global String getTotalPrice() {}

  global String getTotalTax() {}

  global String getUnitAdjustedPrice() {}

  global String getUnitAdjustedPriceWithItemAdj() {}

  global String getUnitAdjustmentAmount() {}

  global String getUnitItemAdjustmentAmount() {}

  global void setCartData(ConnectApi.CartItemCollection value) {}

  global void setCurrencyIsoCode(String value) {}

  global void setFirstPymtTotalAmount(String value) {}

  global void setFirstPymtTotalListPrice(String value) {}

  global void setFirstPymtTotalPrice(String value) {}

  global void setFirstPymtTotalTax(String value) {}

  global void setItemizedAdjustmentAmount(String value) {}

  global void setListPrice(String value) {}

  global void setProductClass(ConnectApi.ProductClass value) {}

  global void setQuoteLineItemId(String value) {}

  global void setSalesPrice(String value) {}

  global void setTotalAdjustmentAmount(String value) {}

  global void setTotalAmount(String value) {}

  global void setTotalListPrice(String value) {}

  global void setTotalPrice(String value) {}

  global void setTotalTax(String value) {}

  global void setUnitAdjustedPrice(String value) {}

  global void setUnitAdjustedPriceWithItemAdj(String value) {}

  global void setUnitAdjustmentAmount(String value) {}

  global void setUnitItemAdjustmentAmount(String value) {}

}