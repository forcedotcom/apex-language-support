/**
 * PushNotification is used to configure push notifications and send them from an Apex trigger.
 */
global class PushNotification {

  global PushNotification() {}

  global void send(String application, Set<String> users) {}

  global void setPayload(Map<String,Object> payload) {}

  global void setTtl(Integer ttl) {}

  global Object clone() {}

}