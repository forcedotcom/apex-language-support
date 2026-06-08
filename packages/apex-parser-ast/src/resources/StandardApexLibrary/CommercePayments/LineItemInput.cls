/**
 * Sends the list of individual line items associated with the payment to the gateway adapter.
 */
global class LineItemInput {

  global LineItemInput() {}

  public Map<String,String> additionalAttributes;

  public String commodityCode;

  public String description;

  public Double discount;

  public Boolean discountIndicator;

  public Double dutyAmount;

  public String grossNetIndicator;

  public String lineItemId;

  public Double lineItemTotal;

  public String name;

  public Integer quantity;

  public Double shippingAmount;

  public String sku;

  public Double taxAmount;

  public Double taxRate;

  public Double unitPrice;

  public String uom;

  public Boolean equals(Object obj) {}

  public Integer hashCode() {}

  public String toString() {}

  global Object clone() {}

}