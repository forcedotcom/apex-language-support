global class SequenceGapReconciliationOutputRepresentation {
	global ConnectApi.SequenceGapReconciliationErrorOutputRepresentation error;
	global String jobId;
	global List<String> sequencePolicyIds;
	global ConnectApi.StatusEnum status;
	global String submittedAt;
	global List<String> targetObjects;
	global SequenceGapReconciliationOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}