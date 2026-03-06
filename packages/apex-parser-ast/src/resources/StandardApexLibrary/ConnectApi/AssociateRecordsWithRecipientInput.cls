/**
 * Records associated with the survey invitation.
 */
global class AssociateRecordsWithRecipientInput {

  /**
   * ID of the associated records.
   */
  global List < String > associateRecordIds;

  /**
   * Participant ID with whose invitation the record should be associated.
   */
  global String recipientId;

}