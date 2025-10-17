global class SaleApiPaymentMethodRequest {
	global commercepayments.CardPaymentMethodRequest cardPaymentMethod;
	global commercepayments.StandardEntryClassCode standardEntryClassCode;
	global SaleApiPaymentMethodRequest(commercepayments.CardPaymentMethodRequest cardPaymentMethodRequest) { }
	global SaleApiPaymentMethodRequest() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}