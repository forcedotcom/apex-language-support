/**
 * Contains grouping values for a row or column, including the key, label, and value.
 */
global class GroupingValue {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a list of second- or third-level row or column groupings. If there are none, the value is an empty array.
     */
    global List getGroupings() { return null; }

    /**
     * Returns the unique identifier for a row or column grouping. The identifier is used by the fact map to specify data values within each grouping.
     */
    global String getKey() { return null; }

    /**
     * Returns the localized display name of a row or column grouping. For date and time fields, the label is the localized date or time.
     */
    global String getLabel() { return null; }

    /**
     * Returns the value of the field that is used as a row or column grouping.
     * <p>Usage
     * The value depends on the field’s data type.
     * Currency fields:
     * amount: Of type currency. A data cell’s value.
     * currency: Of type picklist. The ISO 4217 currency code, if available; for example, USD for US dollars or CNY for Chinese yuan. (If the grouping is on the converted currency, this value is the currency code for the report and not for the record.)
     * Picklist fields: API name. For example, a custom picklist field—Type of Business with values 1, 2, and 3 for Consulting, Services, and Add-On Business respectively—has 1, 2, or 3 as the grouping value.
     * ID fields: API name.
     * Record type fields: API name.
     * Date and time fields: Date or time in ISO-8601 format.
     * Lookup fields: Unique API name. For example, for the Opportunity Owner lookup field, the ID of each opportunity owner’s Chatter profile page can be a grouping value.
     */
    global Object getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}