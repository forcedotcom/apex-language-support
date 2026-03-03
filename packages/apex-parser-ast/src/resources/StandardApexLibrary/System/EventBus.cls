/**
 * Contains methods for publishing platform events.
 */
global class EventBus {

  /**
   * Returns the event UUID, which identifies a published event message.
   * @param result The SaveResult that is returned by the EventBus.publish call.
   * @return String
   */
  public static String getOperationId(Object result) {}

  /**
   * Publishes the given platform event.
   * @param event An instance of a platform event. For example, an instance of MyEvent__e . You must first define your platform event object in your org.
   * @return Database.SaveResult
   */
  public static Database.SaveResult publish(SObject event) {}

  /**
   * Publishes the given platform event.
   * @param events 
   * @return List<Database.SaveResult>
   */
  public static List<Database.SaveResult> publish(List<SObject> events) {}

  /**
   * Publishes the given platform event.
   * @param event An instance of a platform event. For example, an instance of MyEvent__e . You must first define your platform event object in your org.
   * @param callback 
   * @return Database.SaveResult
   */
  public static Database.SaveResult publish(SObject event, Object callback) {}

  /**
   * Publishes the given platform event.
   * @param sobjects 
   * @param callback 
   * @return List<Database.SaveResult>
   */
  public static List<Database.SaveResult> publish(List<SObject> sobjects, Object callback) {}

}