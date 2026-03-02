/**
 * Use the QuickAction.QuickActionRequest class for providing action information for quick actions to be performed by QuickAction class methods. Action information includes the action name, context record ID, and record.
 */
public class QuickActionRequest {

  /**
   * Returns this QuickAction’s context record ID.
   * @return Id
   */
  public Id getContextId() {}

  /**
   * Returns this QuickAction’s name.
   * @return String
   */
  public String getQuickActionName() {}

  /**
   * Returns the QuickAction’s associated record.
   * @return SObject
   */
  public SObject getRecord() {}

  /**
   * Sets this QuickAction’s context ID. Returned by getContextId .
   * @param contextId 
   * @return Void
   */
  public Void setContextId(Id contextId) {}

  /**
   * Sets this QuickAction’s name. Returned by getQuickActionName .
   * @param name 
   * @return Void
   */
  public Void setQuickActionName(String name) {}

  /**
   * Sets a record for this QuickAction. Returned by getRecord .
   * @param record 
   * @return Void
   */
  public Void setRecord(SObject record) {}

}