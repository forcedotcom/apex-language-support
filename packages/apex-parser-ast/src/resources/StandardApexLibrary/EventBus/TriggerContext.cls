/**
 * Provides information about the platform event or change event trigger that’s currently executing, such as how many times the trigger was retried due to the EventBus.RetryableException . Also, provides a method to resume trigger executions.
 */
global class TriggerContext {

  /**
   * Returns an instance of the EventBus.TriggerContext class containing information about the currently executing trigger.
   * @return eventbus.TriggerContext
   */
  public static eventbus.TriggerContext currentContext() {}

  /**
   * Returns the replay ID that was set by setResumeCheckpoint() . The returned value is the replay ID of the event message after which trigger processing resumes in a new trigger invocation.
   * @return String
   */
  public String getResumeCheckpoint() {}

  /**
   * Sets a checkpoint in the event stream where the platform event trigger resumes execution in a new invocation. Use this method to recover from limit and uncaught exceptions, or to control the number of events processed in one trigger execution. When calling this method, pass in the replay ID of the last successfully processed event message. When the trigger stops execution before all events in Trigger.New are processed, either because of an uncaught exception or intentionally, the trigger is invoked again. The new execution starts with the event message in the stream after the one with the checkpointed Replay ID.
   * @param resumeReplayId The replay ID of the last successfully processed platform event message, after which to resume processing in a new trigger execution context.
   */
  public void setResumeCheckpoint(String resumeReplayId) {}

}