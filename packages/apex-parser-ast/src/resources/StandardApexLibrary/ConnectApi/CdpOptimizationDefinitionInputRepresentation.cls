global class CdpOptimizationDefinitionInputRepresentation {
	global List<ConnectApi.CdpOptimizationConstraintInputRepresentation> constraints;
	global String description;
	global String id;
	global ConnectApi.CdpOptimizationSourceDataInputRepresentation inputSourceDataset;
	global String name;
	global ConnectApi.CdpOptimizationObjectiveInputRepresentation objective;
	global String objectiveSingular;
	global ConnectApi.CdpOptimizationOutputDataInputRepresentation outputDataset;
	global String randomSeed;
	global String schemaVersion;
	global List<ConnectApi.CdpOptimizationVariableInputRepresentation> variables;
	global CdpOptimizationDefinitionInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}