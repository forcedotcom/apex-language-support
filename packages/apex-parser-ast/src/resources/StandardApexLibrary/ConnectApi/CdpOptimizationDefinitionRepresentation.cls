global class CdpOptimizationDefinitionRepresentation {
	global List<ConnectApi.CdpOptimizationConstraintRepresentation> constraints;
	global ConnectApi.CdpOptimizationSourceDataRepresentation inputSourceDataset;
	global ConnectApi.CdpOptimizationObjectiveOutputRepresentation objective;
	global String objectiveSingular;
	global ConnectApi.CdpOptimizationOutputDataRepresentation outputDataset;
	global List<ConnectApi.CdpOptimizationVariableRepresentation> variables;
	global CdpOptimizationDefinitionRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}