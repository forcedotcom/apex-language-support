global class CdpOptimizationConstraintInputRepresentation {
	global List<ConnectApi.CdpOptimizationConditionFieldInputRepresentation> conditionFields;
	global List<ConnectApi.CdpOptimizationConditionFormulaInputRepresentation> conditionFormulas;
	global ConnectApi.CdpOptimizationConstraintTypeEnum constraintType;
	global ConnectApi.CdpOptimizationContributionInputRepresentation contribution;
	global String description;
	global String name;
	global CdpOptimizationConstraintInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}