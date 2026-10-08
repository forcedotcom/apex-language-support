trigger TriggerException on Account (before insert) {
  public class InnerException extends Exception {}
}
