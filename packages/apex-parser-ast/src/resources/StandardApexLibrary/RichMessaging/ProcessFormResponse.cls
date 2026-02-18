global class ProcessFormResponse {
	global String externalResourceName;
	global Map<String,String> formValues;
	global String inReplyToMessageId;
	global Id messageSessionId;
	global Id messagingComponentId;
	global ProcessFormResponse(Map<String,String> formValues, Id messageSessionId, Id messagingComponentId, String externalResourceName, String inReplyToMessageId) { }
	global Object clone() { }

}