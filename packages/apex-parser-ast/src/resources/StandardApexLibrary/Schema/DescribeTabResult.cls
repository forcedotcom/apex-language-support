/**
 * Contains tab metadata information for a tab in a standard or custom app available in the Salesforce user interface.
 * Usage
 * The getTabs method of the Schema.DescribeTabSetResult returns a list of Schema.DescribeTabResult objects that describe the tabs of one app.
 * The methods in the Schema.DescribeTabResult class can be called using their property counterparts. For each method starting with get, you can omit the get prefix and the ending parentheses () to call the property counterpart. For example, tabResultObj.label is equivalent to tabResultObj.getLabel(). Similarly, for each method starting with is, omit the is prefix and the ending parentheses (). For example, tabResultObj.isCustom is equivalent to tabResultObj.custom.
 */
global class DescribeTabResult {
    global List colors { get; }
    global Boolean custom { get; }
    global List icons { get; }
    global String iconurl { get; }
    global String label { get; }
    global String miniiconurl { get; }
    global String mobileurl { get; }
    global String name { get; }
    global String sobjectname { get; }
    global String tabenumorid { get; }
    global String url { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns a list of color metadata information for all colors associated with this tab. Each color is associated with a theme and context.
     */
    global List getColors() { return null; }

    /**
     * Returns the URL for the main 32 x 32-pixel icon for a tab. This icon corresponds to the current theme (theme3) and appears next to the heading at the top of most pages.
     */
    global String getIconUrl() { return null; }

    /**
     * Returns a list of icon metadata information for all icons associated with this tab. Each icon is associated with a theme and context.
     */
    global List getIcons() { return null; }

    /**
     * Returns the display label of this tab.
     */
    global String getLabel() { return null; }

    /**
     * Returns the URL for the 16 x 16-pixel icon that represents a tab. This icon corresponds to the current theme (theme3) and appears in related lists and other locations.
     */
    global String getMiniIconUrl() { return null; }

    global String getMobileUrl() { return null; }

    global String getName() { return null; }

    /**
     * Returns the name of the sObject that is primarily displayed on this tab (for tabs that display a particular SObject).
     */
    global String getSobjectName() { return null; }

    global String getTabEnumOrId() { return null; }

    /**
     * Returns a fully qualified URL for viewing this tab.
     */
    global String getUrl() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if this is a custom tab, or false if this is a standard tab.
     */
    global Boolean isCustom() { return false; }

    global String toString() { return null; }
}