/**
 * Contains the deleted records retrieved for a specific sObject type and time window.
 */
public class GetDeletedResult {

  /**
   * Returns a list of deleted records for the time window specified in the Database.getDeleted method call.
   * @return List<Database.DeletedRecord>
   */
  public List<Database.DeletedRecord> getDeletedRecords() {}

  /**
   * Returns the date in Coordinated Universal Time (UTC) of the earliest physically deleted object for the sObject type specified in Database.getDeleted .
   * @return Date
   */
  public Date getEarliestDateAvailable() {}

  /**
   * Returns the date in Coordinated Universal Time (UTC) of the last date covered in the Database.getDeleted call.
   * @return Date
   */
  public Date getLatestDateCovered() {}

}