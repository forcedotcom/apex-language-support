global class ResourcesOutputRep {
	global List<ConnectApi.ErrorMessagesRep> error;
	global List<ConnectApi.AssetSearchResultRep> matchingAssets;
	global List<ConnectApi.ProviderSearchResultRep> matchingProviders;
	global ResourcesOutputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}