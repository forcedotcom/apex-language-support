/**
 * Represents a dynamic Visualforce component in Apex.
 */
global class Component {

  global Component() {}

  public List <ApexPages.Component> childComponents;

  public String expressions;

  public String facets;

  global Object clone() {}

}