/**
 * External file permission information.
 */
global class ExternalFilePermissionInformation {

  /**
   * Available permission types for the parent folder of the external file, or null for non-external files or when includeExternalFilePermissionsInfo is false .
   */
  global List < ConnectApi.ContentHubPermissionType > externalFilePermissionTypes;

  /**
   * true if the retrieval of external file information failed or if includeExternalFilePermissionsInfo is false ; false otherwise.
   */
  global Boolean externalFilePermissionsFailure;

  /**
   * Explanation of the failure if a failure occurred and includeExternalFilePermissionsInfo is true ; null otherwise.
   */
  global String externalFilePermissionsInfoFailureReason;

  /**
   * Sharing status for the external file. Values are: DomainSharing —File is shared with the domain. PrivateSharing —File is private or shared only with individuals. PublicSharing —File is publicly shared. Value is null for non-external files or when includeExternalFilePermissionsInfo is false .
   */
  global ConnectApi.ContentHubExternalItemSharingType externalFileSharingStatus;

  /**
   * Available public groups in the external repository or null for non-external files or when includeExternalFilePermissionsInfo is false .
   */
  global List < ConnectApi.RepositoryGroupSummary > repositoryPublicGroups;

}