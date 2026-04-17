/**
 * PushNotification is used to configure push notifications and send them from an Apex trigger.
 */
global class PushNotification {

  public void send(String application, Set<String> users) {}

  public void setPayload(Map<String,Object> payload) {}

  public void setTtl(Integer ttl) {}

}