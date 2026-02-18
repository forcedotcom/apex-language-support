global class ClaimItemOutputRepresentation {
	global Object additionalFields;
	global List<ConnectApi.ClaimAttributeOutputRepresentation> attributes;
	global String category;
	global String id;
	global String instanceKey;
	global String insurancePolicyCoverageId;
	global String insuredItemId;
	global String name;
	global String participantInstanceKey;
	global String productCode;
	global List<ConnectApi.ClaimRelatedObjectOutputRepresentation> relatedObjects;
	global ClaimItemOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}