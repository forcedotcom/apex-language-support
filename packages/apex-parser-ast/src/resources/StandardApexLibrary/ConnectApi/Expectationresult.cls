global class ExpectationResult {
	global String actualValue;
	global String endTime;
	global Integer errorCode;
	global String errorMessage;
	global String expectedValue;
	global String metricExplainability;
	global String metricLabel;
	global String name;
	global String result;
	global Double score;
	global String startTime;
	global ConnectApi.EvaluationStatus status;
	global ExpectationResult() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}