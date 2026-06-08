/**
 * Representation of the quote line item summary lookup.
 */
global class CommerceQuoteLineItem {

  global CommerceQuoteLineItem() {}

  /**
   * Record field containing the quote line item details.
   */
  global Map < String , ConnectApi.RecordFieldRepresentation > fields;

  /**
   * ID of the quote line item.
   */
  global String id;

  /**
   * Details of buyer's product summary for the line item.
   */
  global ConnectApi.BuyerProductSummary product;

  global Object clone() {}

}