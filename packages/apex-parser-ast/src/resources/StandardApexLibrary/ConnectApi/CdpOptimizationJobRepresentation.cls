global class CdpOptimizationJobRepresentation {
	global String createdBy;
	global Datetime createdDate;
	global Datetime endTime;
	global String errorId;
	global ConnectApi.CdpOptimizationJobErrorReasonEnum errorReason;
	global String id;
	global Integer recordCount;
	global String resultDatasetVersion;
	global Double solutionValue;
	global Datetime startTime;
	global ConnectApi.CdpOptimizationJobStatusEnum status;
	global CdpOptimizationJobRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}