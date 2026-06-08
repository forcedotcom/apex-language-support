/**
 * Input representation for updating the quote status and optionally creating an associated note.
 */
global class UpdateQuoteInput {

  global UpdateQuoteInput() {}

  /**
   * Note to be added to the quote.
   */
  global ConnectApi.CommerceNoteInputRepresentation note;

  /**
   * New status to apply to the quote. If not specified, the existing status remains unchanged. Valid values: Draft —Renogiate the quote. Denied —Decline the quote.
   */
  global String status;

  global Object clone() {}

}