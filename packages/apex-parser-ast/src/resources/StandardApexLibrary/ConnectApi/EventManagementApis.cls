global class EventManagementApis {
	global Object clone() { }
	global static ConnectApi.EMGenericOutputRepresentation createMngEvent(ConnectApi.ManagedEventInputRepresentation managedEventInputRepresentation) { }
	global static ConnectApi.EMGenericOutputRepresentation createMngEventBudget(String eventId, ConnectApi.MngEventBudgetInputRepresentation mngEventBudgetInputRepresentation) { }
	global static ConnectApi.EMGenericOutputRepresentation createMngEventParticipantForEvent(String eventId, ConnectApi.ManagedEventParticipantInputRepresentation managedEventParticipantInputRepresentation) { }
	global static ConnectApi.EMGenericOutputRepresentation createMngEventProduct(String eventId, ConnectApi.MngEventProductInputRepresentation mngEventProductInputRepresentation) { }
	global static ConnectApi.EMGenericOutputRepresentation createMngEventSubject(String eventId, ConnectApi.MngEventSubjectInputRepresentation mngEventSubjectInputRepresentation) { }
	global static void deleteMngEvent(String eventId) { }
	global static void deleteMngEventBudget(String eventBudgetId) { }
	global static void deleteMngEventParticipant(String participantId) { }
	global static void deleteMngEventProduct(String eventProductId) { }
	global static void deleteMngEventSubject(String id) { }
	global static ConnectApi.EventComplianceEvaluationResponse evaluateEventCompliance(String eventId, ConnectApi.EventComplianceEvaluationRequest evaluationInputs) { }
	global static ConnectApi.EMGenericOutputRepresentation getManagedEvent(String eventId, Boolean includeTerritories, Boolean includeSubjects, Boolean includeProducts, String fields, Boolean includeSessions, Boolean includeBudgets) { }
	global static ConnectApi.EMGenericOutputRepresentation getMngEventBudgets(String eventId, String fields) { }
	global static ConnectApi.MngEventParticipantCollection getMngEventParticipantsByEvent(String eventId, Integer size, String participantType, String orderBy, Integer pageParam, String sortParam, String fields, String participantName, String participantRole) { }
	global static ConnectApi.EMGenericOutputRepresentation getMngEventProductById(String eventProductId, String fields) { }
	global static ConnectApi.MngEventProductCollection getMngEventProducts(String eventId, Integer count, String fields) { }
	global static ConnectApi.MngEventSubjectCollectionRepresentation getMngEventSubjects(String eventId, String fields) { }
	global static ConnectApi.MngEventCollectionRepresentation getMngEvents(String filterByTerritoryIds, String toDate, Boolean includeProducts, String orderBy, String filters, String eventType, String sortParam, Boolean includeBudgets, String fromDate, Integer size, Boolean includeTerritories, String eventStatus, Boolean includeSubjects, String eventName, Integer pageParam, String fields, Boolean includeSessions) { }
	global static ConnectApi.EMGenericOutputRepresentation updateManagedEvent(String eventId, ConnectApi.ManagedEventUpdateInputRepresentation managedEventUpdateInputRepresentation) { }
	global static ConnectApi.EMGenericOutputRepresentation updateMngEventBudget(ConnectApi.MngEventBudgetUpdateInputRepresentation mngEventBudgetUpdateInputRepresentation, String eventBudgetId) { }
	global static ConnectApi.EMGenericOutputRepresentation updateMngEventParticipant(String participantId, ConnectApi.MngEventParticipantUpdateInput mngEventParticipantUpdateInput) { }

}