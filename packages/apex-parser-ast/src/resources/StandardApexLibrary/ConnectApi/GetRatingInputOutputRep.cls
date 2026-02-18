global class GetRatingInputOutputRep {
	global Map<String,Object> additionalFields;
	global Datetime effectiveDate;
	global Datetime ratingDate;
	global List<ConnectApi.RatingInputNodeOutputRepresentation> ratingInputs;
	global ConnectApi.RatingOptionsOutputRepresentation ratingOptions;
	global List<String> rootProductCodes;
	global String salesTransactionTypeId;
	global String transactionType;
	global GetRatingInputOutputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Map<String,Object> getAdditionalFields() { }
	global Double getBuildVersion() { }
	global Datetime getEffectiveDate() { }
	global Datetime getRatingDate() { }
	global List<ConnectApi.RatingInputNodeOutputRepresentation> getRatingInputs() { }
	global ConnectApi.RatingOptionsOutputRepresentation getRatingOptions() { }
	global List<String> getRootProductCodes() { }
	global String getSalesTransactionTypeId() { }
	global String getTransactionType() { }
	global Integer hashCode() { }
	global void setAdditionalFields(Map<String,Object> value) { }
	global void setEffectiveDate(Datetime value) { }
	global void setRatingDate(Datetime value) { }
	global void setRatingInputs(List<ConnectApi.RatingInputNodeOutputRepresentation> value) { }
	global void setRatingOptions(ConnectApi.RatingOptionsOutputRepresentation value) { }
	global void setRootProductCodes(List<String> value) { }
	global void setSalesTransactionTypeId(String value) { }
	global void setTransactionType(String value) { }
	global String toString() { }

}