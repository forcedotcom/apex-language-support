global class PresentationInput {
	global Datetime activationDate;
	global List<ConnectApi.CustomFieldRepresentation> customFields;
	global Datetime deactivationDate;
	global Boolean enableDoubleTapZoom;
	global Boolean enablePinchZoom;
	global String id;
	global String name;
	global String playerGesture;
	global String publicContentName;
	global String publicContentUrl;
	global Boolean sendByEmail;
	global List<String> topics;
	global PresentationInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}