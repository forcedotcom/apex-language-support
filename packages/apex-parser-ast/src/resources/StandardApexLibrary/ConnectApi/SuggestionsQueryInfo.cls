global class SuggestionsQueryInfo {
	global ConnectApi.SearchStatus questionsStatus;
	global ConnectApi.SearchStatus recentQueriesStatus;
	global ConnectApi.QueryInfo recordQueryInfo;
	global Map<String,ConnectApi.ObjectQueryInfo> sobjects;
	global ConnectApi.SearchStatus status;
	global SuggestionsQueryInfo() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}