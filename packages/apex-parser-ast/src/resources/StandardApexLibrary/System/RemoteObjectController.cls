/**
 * Use RemoteObjectController to access the standard Visualforce Remote Objects operations in your Remote Objects override methods.
 */
public class RemoteObjectController {

  /**
   * Create a record in the database.
   * @param type The sObject type on which create is being called.
   * @param String 
   * @param fields The fields and values to set on the new record.
   * @return Map< String , Object >
   */
  public static Map< String , Object > create(String type, Map< String, Object > fields) {}

  /**
   * Delete records from the database.
   * @param type The sObject type on which delete is being called.
   * @param recordIds The IDs of the records to be deleted.
   * @return Map< String , Object >
   */
  public static Map< String , Object > del(String type, List< String > recordIds) {}

  /**
   * Retrieve records from the database.
   * @param type The sObject type on which retrieve is being called.
   * @param fields The fields to retrieve for each record.
   * @param String 
   * @param criteria The criteria to use when performing the query.
   * @return Map< String , Object >
   */
  public static Map< String , Object > retrieve(String type, List< String > fields, Map< String, Object > criteria) {}

  /**
   * Update records in the database.
   * @param type The sObject type on which update is being called.
   * @param recordIds The IDs of the records to be updated.
   * @param String 
   * @param fields The fields to update, and the value to update each field with.
   * @return Map< String , Object >
   */
  public static Map< String , Object > update(String type, List< String > recordIds, Map< String, Object > fields) {}

}