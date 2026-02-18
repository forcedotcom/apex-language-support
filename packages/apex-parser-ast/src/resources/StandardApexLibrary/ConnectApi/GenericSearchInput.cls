global class GenericSearchInput {
	global List<ConnectApi.GenericSearchSelectField> fields;
	global Map<String,String> groupByByObject;
	global Boolean highlight;
	global List<ConnectApi.GenericSearchJoin> joins;
	global List<String> objectApiNames;
	global Integer offset;
	global Map<String,ConnectApi.GenericSearchOrderByFields> orderByByObject;
	global String primaryKey;
	global Integer resultLimit;
	global Map<String,ConnectApi.GenericSearchSelectFields> returningFieldsByObject;
	global String scope;
	global String searchFeatureType;
	global String searchTerm;
	global String searchType;
	global Boolean spellCorrection;
	global GenericSearchInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}