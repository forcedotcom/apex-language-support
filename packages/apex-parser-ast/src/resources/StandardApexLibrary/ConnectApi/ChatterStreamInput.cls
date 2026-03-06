/**
 * A Chatter feed stream.
 */
global class ChatterStreamInput {

  /**
   * Description of the stream, up to 1,000 characters.
   */
  global String description;

  /**
   * Name of the stream, up to 120 characters.
   */
  global String name;

  /**
   * List of up to 25 entities whose feeds are included in the stream. Adding an entity that is already added results in no operation. Including the same entity in subscriptionsToAdd and subscriptionsToRemove results in no operation.
   */
  global List < ConnectApi.StreamSubscriptionInput > subscriptionsToAdd;

  /**
   * List of entities whose feeds are removed from the stream. Removing an entity that is already removed results in no operation. Including the same entity in subscriptionsToAdd and subscriptionsToRemove results in no operation.
   */
  global List < ConnectApi.StreamSubscriptionInput > subscriptionsToRemove;

}