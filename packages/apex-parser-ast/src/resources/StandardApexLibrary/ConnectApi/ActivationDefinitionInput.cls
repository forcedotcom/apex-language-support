global class ActivationDefinitionInput {
	global String activationTargetName;
	global ConnectApi.ActivationTargetSubjectConfigInput activationTargetSubjectConfig;
	global List<ConnectApi.AttributeLimitingExpressionInput> attributeLimitingExpressionConfig;
	global List<ConnectApi.ActivationAdditionalAttributesConfigInput> attributesConfig;
	global List<ConnectApi.ActivationContactPointInput> contactPointsConfig;
	global ConnectApi.CuratedEntityInput curatedEntity;
	global ConnectApi.ActivationPlatformCustomerFileSource customerFileSource;
	global String dataExportDefinitionId;
	global List<ConnectApi.DataSourceNameConfigInput> dataSourcesConfig;
	global String dataSpaceName;
	global String description;
	global List<ConnectApi.DMOFilterInput> directDmoFiltersConfig;
	global Integer limitValue;
	global String marketSegmentId;
	global String name;
	global String refreshType;
	global List<ConnectApi.DMOFilterInput> relatedDmoFiltersConfig;
	global String segmentApiName;
	global Boolean shouldExcludeDeletes;
	global Boolean shouldExcludeUpdates;
	global List<ConnectApi.StaticDataInput> staticDataConfig;
	global ActivationDefinitionInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}