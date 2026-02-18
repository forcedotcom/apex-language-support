global class PaymentInitiationUpi {
	global String intentLink;
	global String intentLinkValue;
	global String merchantCategoryCode;
	global String merchantCategoryCodeValue;
	global String payeeHandle;
	global String payeeHandleValue;
	global PaymentInitiationUpi(String payeeHandle, String merchantCategoryCode, String intentLink) { }
	global PaymentInitiationUpi() { }
	global Object clone() { }

}