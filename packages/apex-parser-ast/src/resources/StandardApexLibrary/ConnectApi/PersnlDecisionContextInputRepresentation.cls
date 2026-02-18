global class PersnlDecisionContextInputRepresentation {
	global String anchorId;
	global String anchorType;
	global String correlationId;
	global String dataSpace;
	global List<ConnectApi.PersnlRecommenderDynamicContextVariableInputRepresentation> dynamicContextVariables;
	global String individualId;
	global ConnectApi.PersnlIntentContextInputRepresentation intentContext;
	global String unifiedIndividualId;
	global PersnlDecisionContextInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}