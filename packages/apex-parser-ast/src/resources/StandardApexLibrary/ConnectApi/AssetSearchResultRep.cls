global class AssetSearchResultRep {
	global Map<String,String> additionalSearchResults;
	global List<String> assetCategories;
	global String assetId;
	global String assetName;
	global List<String> assetTypeIds;
	global ConnectApi.AddressOutputRep facilityAddress;
	global String facilityId;
	global String facilityName;
	global String facilityPhone;
	global String productCode;
	global String status;
	global String statusReason;
	global AssetSearchResultRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}