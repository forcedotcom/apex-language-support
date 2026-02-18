global class ElementDto {
	global List<ConnectApi.PricingProcedureAttributeDto> attributes;
	global String elementId;
	global String elementLabel;
	global String elementName;
	global String elementType;
	global String elementUniqueName;
	global ConnectApi.FormulaDetailsDto formulaDetails;
	global List<String> infoRequirements;
	global ConnectApi.ListFilterCondition listFilterCondition;
	global ConnectApi.LookupTableDetailsDto lookupTableDetails;
	global String parentElementName;
	global String parentElementType;
	global Integer priority;
	global Integer sequenceNumber;
	global ElementDto() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}