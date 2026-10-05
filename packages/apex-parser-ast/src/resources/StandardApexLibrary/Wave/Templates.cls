/**
 * The Templates class provides methods for retrieving CRM Analytics template collections, individual templates, and template configurations.
 * <p>Usage
 * Use Templates and its associated class Wave.TemplatesSearchOptions to get CRM Analytics template information.
 * <p>Examples
 * This code sample declares a method that returns a list of the template names.
 * @AuraEnabled(cacheable=true)
 * public static void List<String> getTemplateNames() {
 *   Map<String, Object> o = Wave.Templates.getTemplates(new Wave.TemplatesSearchOptions());
 *   List<Object> templates = (List<Object>) o.get('templates');
 *   List<String> names = new List<String>();
 *   for (Object templateObj : templates) {
 *     names.add((String) ((Map<String, Object>) templateObj.get('name'));
 *   }
 *   return names;
 * }
 * Adding the @AuraEnabled annotation allows Lightning Web Components to access Templates methods directly.
 * For example, in the lwc.js file:
 * import getTemplates from '@salesforce/apex/Wave.Templates.getTemplates';
 * export default class Templates extends LightningElement {
 *   @wire(getTemplates, {
 *     // specifying 'options' is optional
 *     options: {
 *       // values in TemplatesSearchOptions go here; all optional
 *       type: 'app'
 *     }
 *   })
 *   onTemplates({ data, error }) {
 *     if (data) {
 *       console.log('template names=' + data.templates.map(l => l.name).join(', '));
 *     }
 *   }
 * }
 */
global with sharing class Templates {
    global Templates() { }

    @AuraEnabled
    global static Map cdpQueryMetadata(String entityType, String entityCategory, String entityName, String dataspace) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static Map getSObject(String apiName) { return null; }

    @AuraEnabled
    global static List getSObjects() { return null; }

    /**
     * Gets a CRM Analytics template by the specified ID or API name. The returned template is a map of the template JSON attributes as name/value pairs.
     * <p>Example
     * String templateName = (String) Wave.Templates.getTemplate(templateId).get('name');
     * @return A map of the template JSON attribute name/value pairs, where the name is a string with an object value. For attributes details, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.bi_dev_guide_rest.meta/bi_dev_guide_rest/bi_resources_templates_id.htm" target="_blank">TemplateRepresentation</a>.
     */
    global static Map getTemplate(String templateIdOrApiName) { return null; }

    @AuraEnabled
    global static Map getTemplate(String templateIdOrApiName, String filterGroup, String options) { return null; }

    /**
     * Gets the CRM Analytics template configuration by the specified ID or API name. The returned template configuration is a map of the JSON attributes as name/value pairs.
     * <p>Example
     * Map<String, Object> templateVariables = (Map<String, Object>) Wave.Templates.getTemplateConfig(templateId).get('variables');
     * @return A map of template configuration JSON attribute names and the object values. For attribute details, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.bi_dev_guide_rest.meta/bi_dev_guide_rest/bi_resources_templates_configuration.htm" target="_blank">TemplateConfigurationRepresentation</a>.
     */
    global static Map getTemplateConfig(String templateIdOrApiName) { return null; }

    @AuraEnabled
    global static Map getTemplateConfig(String templateIdOrApiName, String filterGroup, Boolean disableApex, String options) { return null; }

    /**
     * Gets all CRM Analytics templates.
     * <p>Example
     * Map<String,Object> templatesMap = Wave.Templates.getTemplates();
     * @return A map of template names and the template object values. For template collection details, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.bi_dev_guide_rest.meta/bi_dev_guide_rest/bi_resources_templates.htm" target="_blank">TemplateCollectionRepresentation</a>.
     */
    global static Map getTemplates() { return null; }

    /**
     * Get a filtered collection of CRM Analytics templates using search options.
     * <p>Example
     * Map<String,Object> templatesMap = Wave.Templates.getTemplates(new Wave.TemplatesSearchOptions());
     * @return A map of template names and the template object values. For template collection details, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.bi_dev_guide_rest.meta/bi_dev_guide_rest/bi_resources_templates.htm" target="_blank">TemplateCollectionRepresentation</a>.
     */
    @AuraEnabled
    global static Map getTemplates(wave.TemplatesSearchOptions options) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}