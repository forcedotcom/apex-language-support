global class Activation {
	global String activationDefinitionId;
	global String activationMappingSchema;
	global String activationRecordSchema;
	global ConnectApi.ActivationTarget activationTarget;
	global String activationTargetId;
	global String activationTargetName;
	global ConnectApi.ActivationTargetSubject activationTargetSubjectConfig;
	global ConnectApi.AttributeLimitingExpressionConfigRepresentation attributeLimitingExpressionConfig;
	global ConnectApi.ActivationAttributesConfig attributesConfig;
	global ConnectApi.ContactPointsConfig contactPointsConfig;
	global ConnectApi.CdpAssetReference curatedEntity;
	global ConnectApi.ActivationPlatformCustomerFileSource customerFileSource;
	global ConnectApi.ActivationDataSources dataSourcesConfig;
	global String dataSpaceName;
	global String description;
	global String developerName;
	global ConnectApi.DmoFiltersConfig directDmoFiltersConfig;
	global Boolean enabled;
	global String historyAudienceDmoApiName;
	global String historyAudienceDmoLabel;
	global Boolean isEnabled;
	global Datetime lastPublishDate;
	global ConnectApi.DataExportRunStatus lastPublishStatus;
	global String lastPublishStatusErrorMsg;
	global String latestAudienceDmoApiName;
	global String latestAudienceDmoLabel;
	global Datetime latestAudienceDmoLastRunTimestamp;
	global Integer limitValue;
	global String marketSegmentId;
	global String membershipName;
	global ConnectApi.QueryPathConfigList queryPathConfig;
	global String refreshType;
	global ConnectApi.DmoFiltersConfig relatedDmoFiltersConfig;
	global String segmentApiName;
	global String segmentId;
	global Boolean shouldExcludeDeletes;
	global Boolean shouldExcludeUpdates;
	global ConnectApi.StaticDataConfig staticDataConfig;
	global ConnectApi.ActivationStatus status;
	global Activation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}