/**
 * Contains the result of an Apex publish callback when the event publishing succeeded. This interface is used as a parameter in the onSuccess method of the EventPublishSuccessCallback interface.
 */
global interface SuccessResult {

  List<String> getEventUuids();

}