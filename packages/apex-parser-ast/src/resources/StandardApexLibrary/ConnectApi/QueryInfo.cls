global class QueryInfo {
	global Map<String,ConnectApi.ObjectQueryInfo> sobjects;
	global List<ConnectApi.SourceQueryInfo> sources;
	global ConnectApi.SearchStatus status;
	global QueryInfo() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}