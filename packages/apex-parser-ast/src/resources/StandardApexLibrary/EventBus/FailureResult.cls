/**
 * Contains the result of an Apex publish callback when the event publishing failed. This interface is used as a parameter in the onFailure method of the EventPublishFailureCallback interface.
 */
global interface FailureResult {

  List<String> getEventUuids();

}