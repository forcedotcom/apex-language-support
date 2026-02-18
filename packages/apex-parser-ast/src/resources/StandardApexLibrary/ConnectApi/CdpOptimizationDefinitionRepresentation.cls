global class CdpOptimizationDefinitionRepresentation {
	global List<ConnectApi.CdpOptimizationConstraintRepresentation> constraints;
	global List<ConnectApi.CdpOptimizationVariableRepresentation> decisionVariables;
	global String description;
	global String developerName;
	global String id;
	global ConnectApi.CdpOptimizationSourceDataRepresentation inputDataSetSpec;
	global Datetime lastCreated;
	global String lastCreatedBy;
	global Datetime lastModified;
	global String lastModifiedBy;
	global Datetime lastRun;
	global String name;
	global ConnectApi.CdpOptimizationObjectiveOutputRepresentation objective;
	global String optimizationLabel;
	global String org;
	global ConnectApi.CdpOptimizationOutputDataRepresentation outputDataset;
	global String solverType;
	global CdpOptimizationDefinitionRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}