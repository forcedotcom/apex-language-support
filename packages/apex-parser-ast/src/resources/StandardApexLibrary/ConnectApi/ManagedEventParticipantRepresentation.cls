global class ManagedEventParticipantRepresentation {
	global Map<String,String> additionalFields;
	global String attendanceConsent;
	global Datetime attendanceConsentDateTime;
	global String attendanceMode;
	global String attendanceStatus;
	global String comments;
	global String createdById;
	global Datetime createdDate;
	global Integer currentInvitationCount;
	global Boolean doesRequireMeal;
	global String eventId;
	global String id;
	global String invitationCntDiscrepancyRsn;
	global String invitationConsent;
	global Datetime invitationConsentDateTime;
	global Integer invitationQuota;
	global Datetime invitationSentDateTime;
	global String invitedById;
	global Boolean isCurrentUser;
	global Boolean isInvitationSent;
	global String lastModifiedById;
	global Datetime lastModifiedDate;
	global String mealType;
	global String name;
	global ConnectApi.ParticipantRepresentation participant;
	global String participantId;
	global String participantPartyRecileStatus;
	global String participantResponse;
	global String participantRoleId;
	global String participantType;
	global String primaryHealthcareProviderId;
	global ManagedEventParticipantRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}