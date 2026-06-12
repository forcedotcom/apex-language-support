/**
 * Contains information about a deleted record.
 */
global class DeletedRecord {

  global DeletedRecord() {}

  /**
   * Returns the deleted date of this record.
   * @return Date
   */
  global Date getDeletedDate() {}

  /**
   * Returns the ID of a record deleted within the time window specified in the Database.getDeleted method.
   * @return Id
   */
  global Id getId() {}

  global Object clone() {}

}