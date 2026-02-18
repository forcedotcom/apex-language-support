global class PricingMetadataOutputRepresentation {
	global ConnectApi.ElementParallelizationOutputRepresentation elementParallelizationData;
	global String errorMessage;
	global Boolean isSuccess;
	global Map<String,Boolean> orgPrefs;
	global List<ConnectApi.OrgValue> orgValues;
	global Map<String,ConnectApi.ProcedureOutputResolutionCacheDto> outputResolutionCacheMap;
	global ConnectApi.PricingProcedureDto pricingProcedureMetadata;
	global PricingMetadataOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}