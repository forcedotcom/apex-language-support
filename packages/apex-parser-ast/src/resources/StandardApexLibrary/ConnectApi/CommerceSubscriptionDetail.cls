global class CommerceSubscriptionDetail {
	global ConnectApi.SubscriptionARCState amendmentStatus;
	global ConnectApi.CommerceSubscriptionBillingSummary billing;
	global ConnectApi.SubscriptionARCState cancelStatus;
	global Datetime endDate;
	global String id;
	global ConnectApi.SubscriptionActionOutput lastAction;
	global List<ConnectApi.ProcessExceptionOutput> processExceptions;
	global ConnectApi.BuyerProductSummary product;
	global Double quantity;
	global ConnectApi.SubscriptionARCState renewalStatus;
	global ConnectApi.ProductSellingModel sellingModel;
	global Datetime startDate;
	global Integer subscriptionTerm;
	global CommerceSubscriptionDetail() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}