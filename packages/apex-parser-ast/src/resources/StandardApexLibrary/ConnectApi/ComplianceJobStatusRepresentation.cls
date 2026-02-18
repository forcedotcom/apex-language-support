global class ComplianceJobStatusRepresentation {
	global String complianceProcedureId;
	global String complianceProcedureVersionId;
	global Integer failedEvaluationCount;
	global String jobId;
	global List<ConnectApi.ComplianceProcedureEvaluation> results;
	global Integer successfulEvaluationCount;
	global Integer totalEvaluationCount;
	global ComplianceJobStatusRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}