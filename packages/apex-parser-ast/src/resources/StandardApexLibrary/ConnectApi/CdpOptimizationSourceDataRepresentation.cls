global class CdpOptimizationSourceDataRepresentation {
	global List<ConnectApi.CdpOptimizationAdditionalFieldAttributeOutputRepresentation> additionalFieldAttributes;
	global List<ConnectApi.CdpDataModelObjectOutputRepresentation> cdpDataModelObjects;
	global String cdpDataSpace;
	global List<ConnectApi.CdpOptimizationColumnRepresentation> columns;
	global List<ConnectApi.CdpOptimizationConditionFieldRepresentation> dataFilters;
	global String description;
	global List<ConnectApi.CdpOptimizationFieldAttributeOutputRepresentation> fields;
	global String id;
	global String name;
	global CdpOptimizationSourceDataRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}