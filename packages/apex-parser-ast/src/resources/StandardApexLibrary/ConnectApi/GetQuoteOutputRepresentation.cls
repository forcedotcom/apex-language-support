global class GetQuoteOutputRepresentation {
	global String contextId;
	global List<ConnectApi.ErrorResponseRepresentation> errors;
	global Map<String,Object> insuranceContext;
	global List<ConnectApi.InsuranceSTOutputRepresentation> salesTransactions;
	global GetQuoteOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global String getContextId() { }
	global List<ConnectApi.ErrorResponseRepresentation> getErrors() { }
	global Map<String,Object> getInsuranceContext() { }
	global List<ConnectApi.InsuranceSTOutputRepresentation> getSalesTransactions() { }
	global Integer hashCode() { }
	global void setContextId(String value) { }
	global void setErrors(List<ConnectApi.ErrorResponseRepresentation> value) { }
	global void setInsuranceContext(Map<String,Object> value) { }
	global void setSalesTransactions(List<ConnectApi.InsuranceSTOutputRepresentation> value) { }
	global String toString() { }

}