global class CdpOptimizationContributionRepresentation {
	global String aggregateLimit;
	global ConnectApi.CdpOptimizationAggregateOperatorEnum aggregateOperator;
	global String contributionFormula;
	global ConnectApi.CdpOptimizationContributionTypeEnum contributionType;
	global String description;
	global String fieldName;
	global ConnectApi.CdpOptimizationFieldTypeEnum fieldType;
	global List<ConnectApi.CdpOptimizationConditionFormulaRepresentation> formulas;
	global String name;
	global CdpOptimizationContributionRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}