global class ManufacturingSampleManagement {
	global Object clone() { }
	global static ConnectApi.SampleManagementOutputRepresentation getProductRequirementSpecification(String specId) { }
	global static ConnectApi.SampleManagementOutputRepresentation getProductRequirementSpecificationVersion(String specId, String versionId) { }
	global static ConnectApi.SampleManagementOutputRepresentation manageProductRequirementSpecification(ConnectApi.SampleManagementInputRepresentation productSpecInput) { }

}