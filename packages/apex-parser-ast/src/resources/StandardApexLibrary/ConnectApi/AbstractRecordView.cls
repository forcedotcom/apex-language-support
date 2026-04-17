/**
 * A view of any record in the org, including a custom object record. This object is used if a specialized object, such as User or ChatterGroup, isn’t available for the record type.
 */
global class AbstractRecordView extends ConnectApi.ActorWithId {

  /**
   * The localized name of the record.
   */
  global String name;

}