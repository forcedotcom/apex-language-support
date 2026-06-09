/**
 * Represents the result of a delete operation on an sObject record. The result is returned by the DataSource.deleteRows method of the DataSource.Connection class.
 */
global class DeleteResult {

  global DeleteResult() {}

  global String errorMessage;

  global String externalId;

  global Boolean success;

  /**
   * Maintains the integrity of lists of type DeleteResult by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
   * @param obj External object whose key is to be validated.
   * @return Boolean
   */
  global Boolean equals(Object obj) {}

  /**
   * Creates a delete result indicating the failure of a delete request for a given external ID.
   * @param externalId The unique identifier of the sObject record to delete.
   * @param errorMessage The reason the delete operation failed.
   * @return DataSource.DeleteResult
   */
  global static DataSource.DeleteResult failure(String externalId, String errorMessage) {}

  /**
   * Maintains the integrity of lists of type DeleteResult by determining the uniqueness of the external object records in a list.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Indicates whether a delete operation succeeded or failed.
   * @param externalId 
   * @return DataSource.DeleteResult
   */
  global static DataSource.DeleteResult success(String externalId) {}

  global Object clone() {}

}