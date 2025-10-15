global class PricingProcedureDto {
	global ConnectApi.ContextDefinitionDto contextDefinition;
	global String description;
	global List<ConnectApi.ElementDto> elements;
	global String expressionSetId;
	global String id;
	global String name;
	global List<ConnectApi.PricingProcedureAttributeDto> variables;
	global PricingProcedureDto() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}