global class SearchResult {
	global String apiName;
	global List<ConnectApi.Chunk> chunks;
	global Map<String,ConnectApi.RecordFieldValue> fields;
	global String id;
	global ConnectApi.MatchInfo matchInfo;
	global String sourceUrl;
	global SearchResult() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}