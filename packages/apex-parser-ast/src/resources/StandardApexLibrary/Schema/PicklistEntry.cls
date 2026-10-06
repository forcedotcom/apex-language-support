/**
 * Represents a picklist entry.
 * Usage
 * Picklist fields contain a list of one or more items from which a user chooses a single item. They display as drop-down lists in the Salesforce user interface. One of the items can be configured as the default item.
 * A Schema.PicklistEntry object is returned from the field describe result using the getPicklistValues method. For example:
 * Schema.DescribeFieldResult F = Account.Industry.getDescribe();
 * List<Schema.PicklistEntry> P = F.getPicklistValues();
 */
global class PicklistEntry {
    global Boolean active { get; }
    global Boolean defaultvalue { get; }
    global String label { get; }
    global String value { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the display name of this item in the picklist.
     */
    global String getLabel() { return null; }

    /**
     * Returns the value of this item in the picklist.
     */
    global String getValue() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if this item must be displayed in the drop-down list for the picklist field in the user interface, false otherwise.
     */
    global Boolean isActive() { return false; }

    /**
     * Returns true if this item is the default value for the picklist, false otherwise. Only one item in a picklist can be designated as the default.
     */
    global Boolean isDefaultValue() { return false; }

    global String toString() { return null; }
}