global class DataCleanRoomDataSpecification {
	global ConnectApi.UseCaseTemplateMappingRepresentation dataMapping;
	global String dataSpaceName;
	global String description;
	global ConnectApi.DataCleanRoomMemberTypeEnum memberType;
	global String ownerOrgId;
	global ConnectApi.DataCleanRoomDataSpecificationStatusEnum status;
	global ConnectApi.DataCleanRoomTemplate templateVersion;
	global DataCleanRoomDataSpecification() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}