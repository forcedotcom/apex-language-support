/**
 * The motif properties contain URLs for small, medium, and large icons that indicate the Salesforce record type. Common record types are files, users, and groups, but all record types have a set of motif icons. Custom object records use their tab style icon. All icons are available to unauthenticated users so that, for example, you can display the motif icons in an email. The motif can also contain the record type’s base color.
 */
global class Motif {

  /**
   * A hex value representing the base color of the record type, or null .
   */
  global String color;

  /**
   * A large icon indicating the record type.
   */
  global String largeIconUrl;

  /**
   * A medium icon indicating the record type.
   */
  global String mediumIconUrl;

  /**
   * A small icon indicating the record type.
   */
  global String smallIconUrl;

  /**
   * An icon in SVG format indicating the record type, or null if the icon doesn’t exist.
   */
  global String svgIconUrl;

}