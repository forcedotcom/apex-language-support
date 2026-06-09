/**
 * Represents a location and style in which to display more than one custom console component in the sidebars of the console.
 */
global class Container {

  global Container() {}

  global Integer height;

  global Boolean isContainerAutoSizeEnabled;

  global String region;

  global List<Metadata.SidebarComponent> sidebarComponents;

  global String style;

  global String unit;

  global Integer width;

  /**
   * Makes a duplicate copy of the Metadata.Container .
   * @return Object
   */
  global Object clone() {}

}