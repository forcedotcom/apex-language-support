global class CdpOptimizationSourceDataInputRepresentation {
	global String cdpDataModelObject;
	global String cdpDataSpace;
	global List<ConnectApi.CdpOptimizationColumnInputRepresentation> columns;
	global List<ConnectApi.CdpOptimizationConditionFieldInputRepresentation> dataFilters;
	global String description;
	global ConnectApi.CdpOptimizationInputTypeEnum inputType;
	global String name;
	global CdpOptimizationSourceDataInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}