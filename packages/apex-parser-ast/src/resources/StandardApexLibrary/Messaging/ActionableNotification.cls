global class ActionableNotification {
	global Object clone() { }
	global String getActionIdentifier() { }
	global String getNotificationTypeId() { }
	global String getRecipientId() { }
	global String getSenderId() { }
	global String getTargetId() { }
	global String getTargetPageRef() { }
global class Builder {
	global ActionableNotification.Builder() { }
	global Messaging.ActionableNotification build() { }
	global Object clone() { }
	global Messaging.ActionableNotification.Builder withActionIdentifier(String actionIdentifier) { }
	global Messaging.ActionableNotification.Builder withNotificationTypeId(String notificationTypeId) { }
	global Messaging.ActionableNotification.Builder withRecipientId(String recipientId) { }
	global Messaging.ActionableNotification.Builder withSenderId(String senderId) { }
	global Messaging.ActionableNotification.Builder withTargetId(String targetId) { }
	global Messaging.ActionableNotification.Builder withTargetPageRef(String targetPageRef) { }

}

}