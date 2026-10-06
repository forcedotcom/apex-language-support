/**
 * Represents a dynamic Visualforce component in Apex.
 */
global abstract class Component {
    /**
     * Returns a reference to the child components for the component.
     * Example
     * Component.Apex.PageBlock pageBlk = new Component.Apex.PageBlock();
     *
     * Component.Apex.PageBlockSection pageBlkSection = new Component.Apex.PageBlockSection(title='dummy header');
     *
     * pageBlk.childComponents.add(pageBlkSection);
     * List<ApexPages.Component>
     */
    global List childComponents { get; }
    global List componentIterations { get; }
    /**
     * Sets the content of an attribute using the expression language notation. The notation for this is expressions.name_of_attribute.
     * Example
     * Component.Apex.InputField inpFld = new
     * Component.Apex.InputField();
     * inpField.expressions.value = '{!Account.Name}';
     * inpField.expressions.id = '{!$User.FirstName}';
     * String
     */
    global ApexPages.expressions expressions { get; }
    /**
     * Sets the content of a facet to a dynamic component. The notation is facet.name_of_facet.
     * Usage
     * Note
     * This property is only accessible by components that support facets.
     * Example
     * Component.Apex.DataTable myDT = new
     * Component.Apex.DataTable();
     * Component.Apex.OutputText footer = new
     * Component.Apex.OutputText(value='Footer Copyright');
     * myDT.facets.footer = footer;
     * String
     */
    global ApexPages.facets facets { get; }
    global String id { get; set; }
    global ApexPages.Component parent { get; }
    global Boolean rendered { get; set; }

    global virtual Boolean equals(Object o) { return false; }

    global ApexPages.Component getComponentById(String id) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}