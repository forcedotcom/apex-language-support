/**
 * Contains methods to create the notification message payload for an Apple device.
 */
global class PushNotificationPayload {

  public static Map<String,Object> apple(String alert, String sound, Integer badgeCount, Map<String,Object> userData) {}

  public static Map<String,Object> apple(String alertBody, String actionLocKey, String locKey, String[] locArgs, String launchImage, String sound, Integer badgeCount, Map<String,Object> userData) {}

}