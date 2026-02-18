global class CdpOptimizationConditionInputRepresentation {
	global ConnectApi.CdpOptimizationConditionTypeEnum conditionType;
	global String constantFieldValue;
	global ConnectApi.CdpOptimizationFieldTypeEnum constantFieldValueType;
	global String description;
	global String fieldName;
	global ConnectApi.CdpOptimizationFieldTypeEnum fieldType;
	global String formula;
	global List<ConnectApi.CdpOptimizationConditionFormulaInputRepresentation> formulaFields;
	global String name;
	global ConnectApi.CdpOptimizationAggregateOperatorEnum operator;
	global CdpOptimizationConditionInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}