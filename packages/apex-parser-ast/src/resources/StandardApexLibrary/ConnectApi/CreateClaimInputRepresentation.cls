global class CreateClaimInputRepresentation {
	global String accountId;
	global List<ConnectApi.ClaimAdditionalFieldInputRep> additionalFields;
	global List<ConnectApi.ClaimAttributeInputRep> attributes;
	global String claimReason;
	global String claimReasonType;
	global String claimType;
	global String incidentTypeId;
	global String insurancePolicyId;
	global List<ConnectApi.ClaimItemInputRep> items;
	global String lossDate;
	global String lossType;
	global String name;
	global ConnectApi.ClaimOptionInputRep options;
	global List<ConnectApi.ClaimParticipantInputRep> participants;
	global String productCode;
	global CreateClaimInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}