global class CdpOptimizationConditionFieldRepresentation {
	global ConnectApi.CdpOptimizationConditionTypeEnum conditionType;
	global String constantFieldValue;
	global ConnectApi.CdpOptimizationFieldTypeEnum constantFieldValueType;
	global String description;
	global String fieldName;
	global ConnectApi.CdpOptimizationFieldTypeEnum fieldType;
	global String formula;
	global List<ConnectApi.CdpOptimizationConditionFormulaRepresentation> formulaFields;
	global String name;
	global ConnectApi.CdpOptimizationAggregateOperatorEnum operator;
	global CdpOptimizationConditionFieldRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}