/**
 * Represents the result of an upsert operation on an external object record. The result is returned by the upsertRows method of the DataSource.Connection class.
 */
public class UpsertResult {

  /**
   * Maintains the integrity of lists of type UpsertResult by determining the equality of external object records in a list. This method is dynamic and is based on the equals method in Java.
   * @param obj External object whose key is to be validated.
   * @return Boolean
   */
  public Boolean equals(Object obj) {}

  /**
   * Creates an upsert result that indicates the failure of a delete request for a given external ID.
   * @param externalId The unique identifier of the external object record to upsert.
   * @param errorMessage The reason the upsert operation failed.
   * @return DataSource.UpsertResult
   */
  public static DataSource.UpsertResult failure(String externalId, String errorMessage) {}

  /**
   * Maintains the integrity of lists of type UpsertResult by determining the uniqueness of the external object records in a list.
   * @return Integer
   */
  public Integer hashCode() {}

  /**
   * Indicates whether a delete operation succeeded or failed.
   * @param externalId 
   * @return DataSource.UpsertResult
   */
  public static DataSource.UpsertResult success(String externalId) {}

}