global class Search {
	global static ConnectApi.SearchAnswer answer(String q, String objectApiName, List<String> displayFields) { }
	global static ConnectApi.SearchAnswer answer(String q, String objectApiName) { }
	global static ConnectApi.SearchAnswer answer(String q) { }
	global Object clone() { }
	global static ConnectApi.ScopedSearchResults find(String objectApiName, ConnectApi.SearchRequest request) { }
	global static ConnectApi.SearchResults find(String q, String configurationName) { }
	global static ConnectApi.SearchResults find(String q) { }
	global static void setTestAnswer(String q, String objectApiName, List<String> displayFields, ConnectApi.SearchAnswer result) { }
	global static void setTestAnswer(String q, String objectApiName, ConnectApi.SearchAnswer result) { }
	global static void setTestAnswer(String q, ConnectApi.SearchAnswer result) { }
	global static void setTestFind(String objectApiName, ConnectApi.SearchRequest request, ConnectApi.ScopedSearchResults result) { }
	global static void setTestFind(String q, String configurationName, ConnectApi.SearchResults result) { }
	global static void setTestFind(String q, ConnectApi.SearchResults result) { }

}