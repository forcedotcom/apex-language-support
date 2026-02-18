global class ResultsEvaluationOutput {
	global String endTime;
	global String errorMessage;
	global String startTime;
	global ConnectApi.EvaluationStatus status;
	global String subjectName;
	global List<ConnectApi.TestCase> testCases;
	global ResultsEvaluationOutput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}