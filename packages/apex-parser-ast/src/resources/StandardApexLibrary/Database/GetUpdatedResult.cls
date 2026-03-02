/**
 * Contains the result for the Database.getUpdated method call.
 */
public class GetUpdatedResult {

  /**
   * Returns the IDs of records updated within the time window specified in the Database.getUpdated method.
   * @return List<Id>
   */
  public List<Id> getIds() {}

  /**
   * Returns the date in Coordinated Universal Time (UTC) of the last date covered in the Database.getUpdated call.
   * @return Date
   */
  public Date getLatestDateCovered() {}

}