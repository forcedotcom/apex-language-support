global class CdpOptimizationConstraintRepresentation {
	global List<ConnectApi.CdpOptimizationConditionFieldRepresentation> conditionFields;
	global List<ConnectApi.CdpOptimizationConditionFormulaRepresentation> conditionFormulas;
	global ConnectApi.CdpOptimizationConstraintTypeEnum constraintType;
	global ConnectApi.CdpOptimizationContributionRepresentation contribution;
	global String description;
	global String name;
	global CdpOptimizationConstraintRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}