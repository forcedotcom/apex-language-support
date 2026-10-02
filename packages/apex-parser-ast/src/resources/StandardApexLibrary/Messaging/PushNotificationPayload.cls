/**
 * Contains methods to create the notification message payload for an Apple device.
 * <p>Usage
 * Apple has specific requirements for the notification payload. and this class has helper methods to create the payload. For more information on Apple’s payload parameters, search for “Apple Push Notification Service” at <a class="xref" href="https://developer.apple.com/library/mac/documentation/" target="_blank" title="HTML (New Window)">https://developer.apple.com/library/mac/documentation/</a>.
 * <p>Example
 * See the Push Notification Example.
 */
global class PushNotificationPayload {
    global Object PushNotificationPayload() { return null; }

    /**
     * Helper method that creates a valid Apple payload from the specified arguments.
     * <p>Usage
     * To generate a valid payload, you must provide a value for at least one of the following parameters: alert, sound, badgeCount.
     * <p>Example
     * See the Push Notification Example.
     * @return Returns a formatted payload that includes all of the specified arguments.
     */
    global static Map apple(String alert, String sound, Integer badgeCount, Map userData) { return null; }

    /**
     * Helper method that creates a valid Apple payload from the specified arguments.
     * <p>Usage
     * To generate a valid payload, you must provide a value for at least one of the following parameters: alert, sound, badgeCount.
     * @return Returns a formatted payload that includes all of the specified arguments.
     */
    global static Map apple(String alertBody, String actionLocKey, String locKey, List locArgs, String launchImage, String sound, Integer badgeCount, Map userData) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}