global class OpenClaimCoverageInputRep {
	global List<ConnectApi.ClaimAdditionalFieldInputRep> additionalFields;
	global String claimId;
	global String claimItemId;
	global String claimParticipantId;
	global String currencyIsoCode;
	global Double expenseReserveAmount;
	global String insurancePolicyAssetId;
	global String insurancePolicyCoverageId;
	global Double lossReserveAmount;
	global String name;
	global String reserveProcessingMode;
	global OpenClaimCoverageInputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}