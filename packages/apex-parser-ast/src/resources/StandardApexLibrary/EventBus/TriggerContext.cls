/**
 * Provides information about the platform event or change event trigger that’s currently executing, such as how many times the trigger was retried due to the EventBus.RetryableException. Also, provides a method to resume trigger executions.
 */
global class TriggerContext {
    /**
     * Read-only. The error message that the last thrown EventBus.RetryableException contains.
     * Usage
     * The error message that this property returns is the message that was passed in when creating the EventBus.RetryableException exception, as follows.
     * throw new EventBus.RetryableException(
     *              'Condition is not met, so retrying the trigger again.');
     * String
     */
    global String lastError { get; }
    /**
     * Read-only. The number of times the trigger was retried due to throwing the EventBus.RetryableException.
     * Integer
     */
    global Integer retries { get; }

    /**
     * Returns an instance of the EventBus.TriggerContext class containing information about the currently executing trigger.
     * @return Information about the currently executing trigger.
     */
    global static eventbus.TriggerContext currentContext() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the replay ID that was set by setResumeCheckpoint(). The returned value is the replay ID of the event message after which trigger processing resumes in a new trigger invocation.
     */
    global String getResumeCheckpoint() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets a checkpoint in the event stream where the platform event trigger resumes execution in a new invocation. Use this method to recover from limit and uncaught exceptions, or to control the number of events processed in one trigger execution. When calling this method, pass in the replay ID of the last successfully processed event message. When the trigger stops execution before all events in Trigger.New are processed, either because of an uncaught exception or intentionally, the trigger is invoked again. The new execution starts with the event message in the stream after the one with the checkpointed Replay ID.
     * Usage
     * The method throws an EventBus.InvalidReplayIdException if the supplied Replay ID is not valid—the replay ID is not in the current trigger batch of events, in the Trigger.new list.
     * Example
     * This snippet shows how to call the method and pass in the replayId property of an event instance.
     * EventBus.TriggerContext.currentContext().setResumeCheckpoint(event.replayId);
     */
    global void setResumeCheckpoint(String resumeReplayId) { }

    global override virtual String toString() { return null; }
}