/**
 * Representation of quote details response.
 */
global class CommerceQuoteDetail {

  global CommerceQuoteDetail() {}

  /**
   * Detailed error message if the operation was unsuccessful.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * Record field containing the quote field details.
   */
  global Map < String , ConnectApi.RecordFieldRepresentation > fields;

  /**
   * ID of the quote.
   */
  global String id;

  /**
   * List of quote line items.
   */
  global List < ConnectApi.CommerceQuoteLineItem > lineItems;

  /**
   * List of notes exchanged between the buyer and the sales representative.
   */
  global List < ConnectApi.CommerceNote > notes;

  /**
   * Quote reference number of the quote.
   */
  global String quoteNumber;

  /**
   * Status of the quote.
   */
  global String status;

  global Object clone() {}

}