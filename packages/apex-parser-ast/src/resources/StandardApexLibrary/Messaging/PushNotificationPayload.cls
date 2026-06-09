/**
 * Contains methods to create the notification message payload for an Apple device.
 */
global class PushNotificationPayload {

  global PushNotificationPayload() {}

  global static Map<String,Object> apple(String alert, String sound, Integer badgeCount, Map<String,Object> userData) {}

  global static Map<String,Object> apple(String alertBody, String actionLocKey, String locKey, String[] locArgs, String launchImage, String sound, Integer badgeCount, Map<String,Object> userData) {}

  global Object clone() {}

}