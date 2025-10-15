global class ElementDto {
	global List<ConnectApi.PricingProcedureAttributeDto> attributes;
	global String elementId;
	global String elementLabel;
	global String elementName;
	global String elementType;
	global String elementUniqueName;
	global ConnectApi.FormulaDetailsDto formulaDetails;
	global ConnectApi.LookupTableDetailsDto lookupTableDetails;
	global Integer sequenceNumber;
	global ElementDto() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}