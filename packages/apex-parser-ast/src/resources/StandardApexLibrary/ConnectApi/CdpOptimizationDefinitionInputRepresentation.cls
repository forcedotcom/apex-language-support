global class CdpOptimizationDefinitionInputRepresentation {
	global List<ConnectApi.CdpOptimizationConstraintInputRepresentation> constraints;
	global List<ConnectApi.CdpOptimizationVariableInputRepresentation> decisionVariables;
	global String description;
	global String id;
	global ConnectApi.CdpOptimizationSourceDataInputRepresentation inputDataSetSpec;
	global String name;
	global ConnectApi.CdpOptimizationObjectiveInputRepresentation objective;
	global String optimizationLabel;
	global ConnectApi.CdpOptimizationOutputDataInputRepresentation outputDataset;
	global Integer randomSeed;
	global String schemaVersion;
	global CdpOptimizationDefinitionInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}