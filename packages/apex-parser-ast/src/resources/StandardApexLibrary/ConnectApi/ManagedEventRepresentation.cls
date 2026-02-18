global class ManagedEventRepresentation {
	global Map<String,String> additionalFields;
	global String campaignId;
	global String createdById;
	global Datetime createdDate;
	global String description;
	global Datetime endDateTime;
	global Integer estimatedParticipantCount;
	global List<ConnectApi.MngEventBudgetRepresentation> eventBudgets;
	global String eventId;
	global String eventMode;
	global List<ConnectApi.MngEventProductOutputRepresentation> eventProducts;
	global List<ConnectApi.EventSessionRepresentation> eventSessions;
	global String eventStatus;
	global List<ConnectApi.MngEventSubjectRepresentation> eventSubjects;
	global List<ConnectApi.EventTerritoryRepresentation> eventTerritories;
	global String eventTypeId;
	global String eventUrl;
	global String lastModifiedById;
	global Datetime lastModifiedDate;
	global String locationId;
	global String name;
	global Datetime startDateTime;
	global ManagedEventRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}