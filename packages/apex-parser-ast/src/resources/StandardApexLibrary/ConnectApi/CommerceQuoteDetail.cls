global class CommerceQuoteDetail {
	global List<ConnectApi.ErrorResponse> errors;
	global Map<String,ConnectApi.RecordField> fields;
	global String id;
	global List<ConnectApi.CommerceQuoteLineItem> lineItems;
	global List<ConnectApi.CommerceNote> notes;
	global String quoteNumber;
	global String status;
	global CommerceQuoteDetail() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}