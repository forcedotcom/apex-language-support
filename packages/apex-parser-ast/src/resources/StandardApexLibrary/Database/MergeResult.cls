/**
 * Contains the result of a merge Database method operation.
 */
global class MergeResult {

  /**
   * Returns a list of Database.Error objects representing the errors encountered, if any, during a merge operation using the Database. merge method. If no error occurred, returns null.
   * @return List<Database.Error>
   */
  public List<Database.Error> getErrors() {}

  /**
   * Returns the ID of the master record into which other records were merged.
   * @return Id
   */
  public Id getId() {}

  /**
   * Returns the IDs of the records merged into the master record.
   * @return List<String>
   */
  public List<String> getMergedRecordIds() {}

  /**
   * Returns the IDs of all related records that were reparented as a result of the merge that are viewable by the user sending the merge call.
   * @return List<String>
   */
  public List<String> getUpdatedRelatedIds() {}

  /**
   * Indicates whether the merge was successful ( true ) or not ( false ).
   * @return Boolean
   */
  public Boolean isSuccess() {}

}