global class CdpOptimizationConnectApi {
	global Object clone() { }
	global static ConnectApi.CdpOptimizationDefinitionRepresentation createOptimizationDefinition() { }
	global static ConnectApi.CdpOptimizationJobIdRepresentation createOptimizationJob(String traceId, String spanId, String parentSpanId, String callerName) { }
	global static ConnectApi.CdpOptimizationJobIdRepresentation createOptimizationJobForDefinition(String defId) { }
	global static void deleteOptimizationDefinition(String defId) { }
	global static ConnectApi.CdpOptimizationDataModelObjectRepresentation getDataModelObject(String dataSpaceName, String dmoApiName) { }
	global static ConnectApi.CdpOptimizationDataModelObjectQueryCountRepresentation getDataModelObjectQueryCount(String dataSpaceName, String dmoApiName) { }
	global static ConnectApi.CdpOptimizationDataLakeObjectRepresentation getOptimizationDataLakeObject(String dataSpaceName, String dmoApiName) { }
	global static ConnectApi.CdpOptimizationDataLakeObjectCollectionRepresentation getOptimizationDataLakeObjects(String dataSpaceName) { }
	global static ConnectApi.CdpOptimizationDataModelObjectCollectionRepresentation getOptimizationDataModelObjects(String dataSpaceName) { }
	global static ConnectApi.CdpOptimizationDataSpaceCollectionRepresentation getOptimizationDataSpaces(String orgID) { }
	global static ConnectApi.CdpOptimizationDefinitionCollectionRepresentation getOptimizationDefinitions() { }
	global static ConnectApi.CdpOptimizationJobRepresentation getOptimizationJobDetails(String defId, String jobId) { }
	global static ConnectApi.CdpOptimizationJobStatusRepresentation getOptimizationJobStatusById(String defId, String jobId) { }
	global static ConnectApi.CdpOptimizationJobCollectionRepresentation getOptimizationJobsForDefinition(String defId) { }
	global static ConnectApi.CdpOptimizationDefinitionRepresentation getSingleOptimizationDefinition(String defId) { }
	global static ConnectApi.CdpOptimizationDefinitionRepresentation patchOptimizationDefinition(String defId) { }
	global static ConnectApi.CdpOptimizationJobStatusRepresentation updateOptimizationJob(String defId, String jobId) { }

}