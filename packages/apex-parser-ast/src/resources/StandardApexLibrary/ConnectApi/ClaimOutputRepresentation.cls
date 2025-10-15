global class ClaimOutputRepresentation {
	global String accountId;
	global List<ConnectApi.ClaimAttributeOutputRepresentation> attributes;
	global String claimId;
	global String claimReason;
	global String claimReasonType;
	global String claimType;
	global String contextId;
	global List<ConnectApi.ErrorDetail> errors;
	global String incidentTypeId;
	global String insurancePolicyId;
	global List<ConnectApi.ClaimItemOutputRepresentation> items;
	global Datetime lossDate;
	global String lossType;
	global String name;
	global List<ConnectApi.ClaimParticipantOutputRepresentation> participants;
	global String productCode;
	global ClaimOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}