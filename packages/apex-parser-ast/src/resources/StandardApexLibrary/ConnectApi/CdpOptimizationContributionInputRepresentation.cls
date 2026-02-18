global class CdpOptimizationContributionInputRepresentation {
	global String aggregateLimit;
	global ConnectApi.CdpOptimizationAggregateOperatorEnum aggregateOperator;
	global String contributionFormula;
	global ConnectApi.CdpOptimizationContributionTypeEnum contributionType;
	global String description;
	global String fieldName;
	global ConnectApi.CdpOptimizationFieldTypeEnum fieldType;
	global List<ConnectApi.CdpOptimizationConditionFormulaInputRepresentation> formulas;
	global String name;
	global CdpOptimizationContributionInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}