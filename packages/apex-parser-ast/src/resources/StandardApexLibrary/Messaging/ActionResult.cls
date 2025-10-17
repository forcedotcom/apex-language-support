global class ActionResult {
	global Object clone() { }
	global Messaging.ActionError getErrorCode() { }
	global String getMessage() { }
	global Boolean isSuccess() { }
global class Builder {
	global ActionResult.Builder() { }
	global Messaging.ActionResult build() { }
	global Object clone() { }
	global Messaging.ActionResult.Builder withErrorCode(Messaging.ActionError errorCode) { }
	global Messaging.ActionResult.Builder withMessage(String message) { }
	global Messaging.ActionResult.Builder withSuccess(Boolean success) { }

}

}