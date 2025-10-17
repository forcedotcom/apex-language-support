global class ResourcesInputRep {
	global Boolean ascending;
	global ConnectApi.AssetSearchCriteriaInputRep assetSearchCriteria;
	global ConnectApi.CommonSearchCriteriaInputRep commonSearchCriteria;
	global Integer offset;
	global String orderBy;
	global ConnectApi.ProviderSearchCriteriaInputRep providerSearchCriteria;
	global String resourceType;
	global Integer searchLimit;
	global ResourcesInputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}