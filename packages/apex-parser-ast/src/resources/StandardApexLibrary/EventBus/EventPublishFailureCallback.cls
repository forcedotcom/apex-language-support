/**
 * Implement this interface to track platform event messages that failed to publish. The onFailure() method in this interface is called when the final result of the asynchronous publish operation becomes available.
 * Usage
 * For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.platform_events.meta/platform_events/platform_events_publish_callbacks.htm" target="_blank">Get the Result of Asynchronous Platform Event Publishing with Apex Publish Callbacks</a> in the Platform Events Developer Guide.
 */
global interface EventPublishFailureCallback {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * The system invokes this method when the final result of EventBus.publish is available and the publishing of the platform event message failed.
     */
    abstract void onFailure(eventbus.FailureResult failureResult);

    virtual String toString();
}