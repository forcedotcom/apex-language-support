/**
 * Contains the result of an Apex publish callback when the event publishing succeeded. This interface is used as a parameter in the onSuccess method of the EventPublishSuccessCallback interface.
 */
global interface SuccessResult {
    virtual Boolean equals(Object arg0);

    /**
     * Returns a list of EventUuid field values of each platform event that is included in the EventBus.EventPublishSuccessCallback.
     */
    abstract List getEventUuids();

    virtual Integer hashCode();

    virtual String toString();
}