global class MediaProductConfiguratorInputRepresentation {
	global List<ConnectApi.MediaProductConfiguratorAddedNodeInputRepresentation> addedNodes;
	global ConnectApi.MediaProductConfiguratorOptionsInputRepresentation configuratorOptions;
	global String correlationId;
	global List<ConnectApi.MediaProductConfiguratorDeletedNodeInputRepresentation> deletedNodes;
	global ConnectApi.MediaContextInputRepresentation qualificationContext;
	global String transactionContextId;
	global String transactionId;
	global String transactionLineId;
	global List<ConnectApi.MediaProductConfiguratorUpdatedNodeInputRepresentation> updatedNodes;
	global MediaProductConfiguratorInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}