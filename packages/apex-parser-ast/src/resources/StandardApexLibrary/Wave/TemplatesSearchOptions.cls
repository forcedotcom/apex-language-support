/**
 * The TemplatesSearchOptions class provides optional properties to filter the template collection.
 * Usage
 * Use TemplatesSearchOptions with Wave.Templates class to filter the CRM Analytics template collection returned. For example:
 * public static void List<String> getAppTemplates() {
 *   Wave.TemplateSearchOptions tsOptions = new Wave.TemplatesSearchOptions();
 *   tsOptions.type = 'app';
 *
 *   Map<String, Object> o = Wave.Templates.getTemplates(tsOptions);
 *   List<Object> appTemplates = (List<Object>) o.get('templates');
 *   List<String> names = new List<String>();
 *   for (Object templateObj : appTemplates) {
 *     names.add((String) ((Map<String, Object>) templateObj.get('name'));
 *   }
 *   return names;
 * }
 */
@TestVisible
global class TemplatesSearchOptions {
    /**
     * Specifies the Connect API filter group for CRM Analytics template search options.
     * Example
     * Wave.TemplateSearchOptions tsOptions = new Wave.TemplatesSearchOptions();
     * tsOptions.filterGroup = 'small';
     * String
     * Uses the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.chatterapi.meta/chatterapi/intro_filter_groups.htm" target="_blank">ConnectFilterGroupEnum</a> values.
     */
    @AuraEnabled
    global String filterGroup { get; set; }
    /**
     * Specifies the template visibility option to filter the CRM Analytics template collection by.
     * Uses the ConnectWaveTemplateVisibilityOptionsEnum values. Valid values are CreateApp, ViewOnly, and ManageableOnly.
     * Example
     * Wave.TemplateSearchOptions tsOptions = new Wave.TemplatesSearchOptions();
     * tsOptions.options = 'ViewOnly';
     * String
     */
    @AuraEnabled
    global String options { get; set; }
    /**
     * Sets the template type to filter the CRM Analytics template collection by.
     * Uses the ConnectWaveTemplateTypeEnum values. Valid values are app, dashboard, embedded, and lens.
     * Example
     * Wave.TemplateSearchOptions tsOptions = new Wave.TemplatesSearchOptions();
     * tsOptions.type = 'app';
     * String
     */
    @AuraEnabled
    global String type { get; set; }

    global TemplatesSearchOptions() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}