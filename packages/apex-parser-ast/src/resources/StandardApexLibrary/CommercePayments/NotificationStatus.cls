/**
 * Shows whether the payments platform successfully received the notification from the gateway.
 * <p>Usage
 * When the gateway sends a notification for a payment request, the payments platform delegates the notification request to the gateway adapter. First, the adapter evaluates the signature from the notification request. If the signature is valid, the adapter builds a notification object to store information about the notification. During this process, the adapter sets the NotificationStatus to Failed or Success based on information from the notification request.
 * <p>Enum Values
 * The following are the values of the commercepayments.NotificationStatus enum.
 */
global enum NotificationStatus {
    Failed,
    Success

}