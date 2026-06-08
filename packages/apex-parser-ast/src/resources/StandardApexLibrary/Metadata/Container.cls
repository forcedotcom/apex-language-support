/**
 * Represents a location and style in which to display more than one custom console component in the sidebars of the console.
 */
global class Container {

  global Container() {}

  public Integer height;

  public Boolean isContainerAutoSizeEnabled;

  public String region;

  public List<Metadata.SidebarComponent> sidebarComponents;

  public String style;

  public String unit;

  public Integer width;

  /**
   * Makes a duplicate copy of the Metadata.Container .
   * @return Object
   */
  public Object clone() {}

}