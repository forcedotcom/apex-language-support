global class OnDemandDocGenInputRequest {
	global String documentTemplateId;
	global String documentTitle;
	global ConnectApi.InvoiceUsageTypeEnum invoiceUsageType;
	global String recordId;
	global Boolean shouldForceRegenerate;
	global String tokenData;
	global OnDemandDocGenInputRequest() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}