global class DynamicPickList {
	global DynamicPickList() { }
	global Object clone() { }
	global VisualEditor.DataRow getDefaultValue() { }
	global String getLabel(Object attributeValue) { }
	global VisualEditor.DynamicPickListRows getValues() { }
	global VisualEditor.DynamicPickListRows getValuesForSemanticSearch(String semanticSearchQuery) { }
	global Boolean isValid(Object attributeValue) { }

}