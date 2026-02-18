global class CommerceQuoteCollection {
	global Integer count;
	global String currentPageToken;
	global String currentPageUrl;
	global List<ConnectApi.ErrorResponse> errors;
	global String nextPageToken;
	global String nextPageUrl;
	global String previousPageToken;
	global String previousPageUrl;
	global List<ConnectApi.CommerceQuoteWithProductDetail> quotes;
	global CommerceQuoteCollection() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}