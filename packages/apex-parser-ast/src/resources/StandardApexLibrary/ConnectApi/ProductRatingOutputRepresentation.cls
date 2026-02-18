global class ProductRatingOutputRepresentation {
	global List<ConnectApi.InsuranceConfigMessageOutputRepresentation> configMessages;
	global String contextId;
	global ConnectApi.ContextJSONOutputRepresentation contextJSON;
	global List<ConnectApi.ErrorResponseRepresentation> errors;
	global Map<String,Object> pricingResult;
	global List<ConnectApi.CPQProductDetailsOutputRepresentation> productDetails;
	global ConnectApi.RatingResultOutputRepresentation ratingResult;
	global List<ConnectApi.InsuranceUITreatmentOutputRepresentation> uiTreatments;
	global ProductRatingOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global List<ConnectApi.InsuranceConfigMessageOutputRepresentation> getConfigMessages() { }
	global String getContextId() { }
	global ConnectApi.ContextJSONOutputRepresentation getContextJSON() { }
	global List<ConnectApi.ErrorResponseRepresentation> getErrors() { }
	global Map<String,Object> getPricingResult() { }
	global List<ConnectApi.CPQProductDetailsOutputRepresentation> getProductDetails() { }
	global ConnectApi.RatingResultOutputRepresentation getRatingResult() { }
	global List<ConnectApi.InsuranceUITreatmentOutputRepresentation> getUiTreatments() { }
	global Integer hashCode() { }
	global void setConfigMessages(List<ConnectApi.InsuranceConfigMessageOutputRepresentation> value) { }
	global void setContextId(String value) { }
	global void setContextJSON(ConnectApi.ContextJSONOutputRepresentation value) { }
	global void setErrors(List<ConnectApi.ErrorResponseRepresentation> value) { }
	global void setPricingResult(Map<String,Object> value) { }
	global void setProductDetails(List<ConnectApi.CPQProductDetailsOutputRepresentation> value) { }
	global void setRatingResult(ConnectApi.RatingResultOutputRepresentation value) { }
	global void setUiTreatments(List<ConnectApi.InsuranceUITreatmentOutputRepresentation> value) { }
	global String toString() { }

}