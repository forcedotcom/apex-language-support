/**
 * Contains the result of an Apex publish callback when the event publishing failed. This interface is used as a parameter in the onFailure method of the EventPublishFailureCallback interface.
 */
global interface FailureResult {
    virtual Boolean equals(Object arg0);

    /**
     * Returns a list of EventUuid field values of each platform event that is included in EventBus.EventPublishFailureCallback.
     */
    abstract List getEventUuids();

    virtual Integer hashCode();

    virtual String toString();
}