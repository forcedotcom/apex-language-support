global class FormulaConfigurationDto {
	global List<String> availableAttributes;
	global String fieldName;
	global String formulaKey;
	global Boolean hasContextReferences;
	global Boolean isFormulaExpression;
	global String operator;
	global Integer sequenceNumber;
	global String valueType;
	global FormulaConfigurationDto() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}