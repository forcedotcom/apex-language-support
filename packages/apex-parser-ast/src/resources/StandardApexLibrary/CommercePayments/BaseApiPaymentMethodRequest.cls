global class BaseApiPaymentMethodRequest {
	global commercepayments.AddressRequest address;
	global String id;
	global commercepayments.PaymentMethodIdType idType;
	global Boolean saveForFuture;
	global BaseApiPaymentMethodRequest(commercepayments.AddressRequest address, String id, Boolean saveForFuture) { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}