/**
 * Contains methods for publishing platform events.
 */
global class EventBus {

  global EventBus() {}

  /**
   * Returns the event UUID, which identifies a published event message.
   * @param result The SaveResult that is returned by the EventBus.publish call.
   * @return String
   */
  global static String getOperationId(Object result) {}

  /**
   * Publishes the given platform event.
   * @param event An instance of a platform event. For example, an instance of MyEvent__e . You must first define your platform event object in your org.
   * @return Database.SaveResult
   */
  global static Database.SaveResult publish(SObject event) {}

  /**
   * Publishes the given platform event.
   * @param events 
   * @return List<Database.SaveResult>
   */
  global static List<Database.SaveResult> publish(List<SObject> events) {}

  /**
   * Publishes the given platform event.
   * @param event An instance of a platform event. For example, an instance of MyEvent__e . You must first define your platform event object in your org.
   * @param callback 
   * @return Database.SaveResult
   */
  global static Database.SaveResult publish(SObject event, Object callback) {}

  /**
   * Publishes the given platform event.
   * @param sobjects 
   * @param callback 
   * @return List<Database.SaveResult>
   */
  global static List<Database.SaveResult> publish(List<SObject> sobjects, Object callback) {}

  global static Database.SaveResult publishWithAccessLevel(SObject event, AccessLevel accesslevel) {}

  global static List<Database.SaveResult> publishWithAccessLevel(List<SObject> events, AccessLevel accesslevel) {}

  global Object clone() {}

}