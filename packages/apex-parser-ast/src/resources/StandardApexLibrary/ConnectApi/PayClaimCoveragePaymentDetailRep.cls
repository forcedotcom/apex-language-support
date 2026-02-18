global class PayClaimCoveragePaymentDetailRep {
	global String claimPaymentSummaryId;
	global Integer consumedLimitCount;
	global List<ConnectApi.ErrorDetail> errors;
	global List<String> insPolicyLimitTrackingIds;
	global Boolean isSuccess;
	global Double paidAmount;
	global PayClaimCoveragePaymentDetailRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}