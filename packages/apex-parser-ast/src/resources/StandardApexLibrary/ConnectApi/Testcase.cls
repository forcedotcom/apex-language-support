global class TestCase {
	global String endTime;
	global String errorMessage;
	global ConnectApi.generatedData generatedData;
	global ConnectApi.Inputs inputs;
	global String startTime;
	global ConnectApi.EvaluationStatus status;
	global Integer testNumber;
	global List<ConnectApi.ExpectationResult> testResults;
	global TestCase() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}