/**
 * File.
 */
global class File extends ConnectApi.ActorWithId {

  /**
   * MD5 checksum for the file.
   */
  global String checksum;

  /**
   * ISO 8601 format date string, for example, 2011-02-25T18:24:31.000Z. File-specific modified date, which is updated only for direct file operations, such as rename. Modifications to the file from outside of Salesforce can update this date.
   */
  global Datetime contentModifiedDate;

  /**
   * Size of the file in bytes.
   */
  global Integer contentSize;

  /**
   * If the file is a link, returns the URL, otherwise, the string null .
   */
  global String contentUrl;

  /**
   * ISO 8601 date string when the file was created.
   */
  global Datetime createdDate;

  /**
   * Description of the file.
   */
  global String description;

  /**
   * URL to the file, that can be used for downloading the file.
   */
  global String downloadUrl;

  /**
   * Extension of the file.
   */
  global String fileExtension;

  /**
   * Type of file, such as PDF, PowerPoint.
   */
  global String fileType;

  /**
   * Specifies if a flash preview version of the file has been rendered. Note Flash renditions were retired on July 16, 2021.
   */
  global String flashRenditionStatus;

  /**
   * Specifies whether the file is an asset.
   */
  global Boolean isFileAsset;

  /**
   * true if the file is synced with Salesforce Files Sync; false otherwise. Note Salesforce Files Sync was retired on May 25, 2018.
   */
  global Boolean isInMyFileSync;

  /**
   * true if the file is a major version; false if the file is a minor version. Major versions can’t be replaced.
   */
  global Boolean isMajorVersion;

  /**
   * File’s MIME type.
   */
  global String mimeType;

  /**
   * Information about the moderation flags on a file. If ConnectApi.Features.communityModeration is false , this property is null .
   */
  global ConnectApi.ModerationFlags moderationFlags;

  /**
   * ISO 8601 format date string, for example, 2011-02-25T18:24:31.000Z. Modifications to the file from within Salesforce update this date.
   */
  global Datetime modifiedDate;

  /**
   * Name of the file.
   */
  global String name;

  /**
   * Specifies the file source. Valid values are: Chatter —file came from Chatter Content —file came from content
   */
  global String origin;

  /**
   * File’s owner.
   */
  global ConnectApi.UserSummary owner;

  /**
   * Specifies if a PDF preview version of the file has been rendered.
   */
  global String pdfRenditionStatus;

  /**
   * Specifies the publish status of the file. PendingAccess —File is pending publishing. PrivateAccess —File is private. PublicAccess —File is public.
   */
  global ConnectApi.FilePublishStatus publishStatus;

  /**
   * URL to the rendition for the file.
   */
  global String renditionUrl;

  /**
   * URL to the 240 x 180 rendition resource for the file. For shared files, renditions process asynchronously after upload. For private files, renditions process when the first file preview is requested, and aren’t available immediately after the file is uploaded.
   */
  global String renditionUrl240By180;

  /**
   * URL to the 720 x 480 rendition resource for the file. For shared files, renditions process asynchronously after upload. For private files, renditions process when the first file preview is requested, and aren’t available immediately after the file is uploaded.
   */
  global String renditionUrl720By480;

  /**
   * Sharing option of the file. Values are: Allowed —Resharing of the file is allowed. Restricted —Resharing of the file is restricted.
   */
  global ConnectApi.FileSharingOption sharingOption;

  /**
   * Sharing privacy of a file. Values are: None —File is visible to anyone with record access. PrivateOnRecords —File is private on records.
   */
  global ConnectApi.FileSharingPrivacy sharingPrivacy;

  /**
   * Sharing role of the file. Admin —Owner permission, but doesn’t own the file. Collaborator —Viewer permission, and can edit, change permissions, and upload a new version of a file. Owner —Collaborator permission, and can make a file private, and delete a file. Viewer —Can view, download, and share a file. WorkspaceManaged —Permission controlled by the library.
   */
  global ConnectApi.FileSharingType sharingRole;

  /**
   * ISO 8601 date string indicating when a user or any automated system process, such as a trigger, updated the file.
   */
  global Datetime systemModstamp;

  /**
   * Text preview of the file if available; null otherwise.
   */
  global String textPreview;

  /**
   * Specifies the rendering status of the 120 x 90 preview image of the file. One of these values: Processing —Image is being rendered. Failed —Rendering process failed. Success —Rendering process was successful. Na —Rendering is not available for this image.
   */
  global String thumb120By90RenditionStatus;

  /**
   * Specifies the rendering status of the 240 x 180 preview image of the file. One of these values: Processing —Image is being rendered. Failed —Rendering process failed. Success —Rendering process was successful. Na —Rendering is not available for this image.
   */
  global String thumb240By180RenditionStatus;

  /**
   * Specifies the rendering status of the 720 x 480 preview image of the file. One of these values: Processing —Image is being rendered. Failed —Rendering process failed. Success —Rendering process was successful. Na —Rendering is not available for this image.
   */
  global String thumb720By480RenditionStatus;

  /**
   * Title of the file.
   */
  global String title;

  /**
   * File’s version number.
   */
  global String versionNumber;

}