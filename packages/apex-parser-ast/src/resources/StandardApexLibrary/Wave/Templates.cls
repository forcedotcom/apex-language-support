/**
 * The Templates class provides methods for retrieving CRM Analytics template collections, individual templates, and template configurations.
 */
global class Templates {

  global Templates() {}

  global static Map<String,Object> getTemplate(String templateIdOrApiName) {}

  global static Map<String,Object> getTemplateConfig(String templateIdOrApiName) {}

  global static Map<String,Object> getTemplates(Wave.TemplatesSearchOptions options) {}

  global static Map<String,Object> getTemplates() {}

  global Object clone() {}

}