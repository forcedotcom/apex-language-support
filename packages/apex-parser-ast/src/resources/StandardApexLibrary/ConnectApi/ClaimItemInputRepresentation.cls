global class ClaimItemInputRepresentation {
	global String action;
	global Object additionalFields;
	global List<ConnectApi.ClaimAttributeInputRepresentation> attributes;
	global String category;
	global String instanceKey;
	global String insurancePolicyCoverageId;
	global String insuredItemId;
	global String name;
	global String participantInstanceKey;
	global String productCode;
	global List<ConnectApi.ClaimRelatedObjectInputRepresentation> relatedObjects;
	global ClaimItemInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}