/**
 * Represents a dynamic Visualforce component in Apex.
 */
global class Component {

  global Component() {}

  global List <ApexPages.Component> childComponents;

  global String expressions;

  global String facets;

  global Object clone() {}

}