/**
 * Profile photo.
 */
global class Photo {

  /**
   * A temporary URL to the large profile picture. The URL expires after 30 days and is available to unauthenticated users.
   */
  global String fullEmailPhotoUrl;

  /**
   * URL to the large profile picture. The default width is 200 pixels, and the height is scaled so the original image proportions are maintained. If a user hasn’t uploaded a photo, this URL points to a default photo. If the user hasn’t uploaded a photo and the request header included X-Connect-Theme: Salesforce1 , this URL points to a default photo based on a theme that the admin selected for the org.
   */
  global String largePhotoUrl;

  /**
   * URL to the medium profile picture. The default width is 160 pixels, and the height is scaled so the original image proportions are maintained. If a user hasn’t uploaded a photo, this URL points to a default photo. If the user hasn’t uploaded a photo and the request header included X-Connect-Theme: Salesforce1 , this URL points to a default photo based on a theme that the admin selected for the org.
   */
  global String mediumPhotoUrl;

  /**
   * 18–character ID to that version of the photo
   */
  global String photoVersionId;

  /**
   * URL to the small profile picture. The default size is 64x64 pixels. If a user hasn’t uploaded a photo, this URL points to a default photo. If the user hasn’t uploaded a photo and the request header included X-Connect-Theme: Salesforce1 , this URL points to a default photo based on a theme that the admin selected for the org.
   */
  global String smallPhotoUrl;

  /**
   * A temporary URL to the small profile. The URL expires after 30 days and is available to unauthenticated users.
   */
  global String standardEmailPhotoUrl;

  /**
   * A resource that returns a Photo object: for example, /services/data/v66.0/chatter/users/005D0000001LL8OIAW/photo .
   */
  global String url;

}